// src/controllers/userLocation.controller.ts
import type { Request, Response } from "express";
import { PrismaClient, LocationType } from "../../generated/prisma/index.js";

const prisma = new PrismaClient();

// IIT Guwahati coordinates
const IIT_GUWAHATI = {
  lat: 26.1923,
  lng: 91.6951,
  radius: 2000
};

export const updateUserLocation = async (req: Request, res: Response) => {
  try {
    const { empCode, locationType, fieldTripDates } = req.body;

    if (!empCode || !locationType) {
      return res.status(400).json({
        success: false,
        error: "Employee Code and location type are required",
      });
    }

    if (!Object.values(LocationType).includes(locationType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid location type. Must be ABSOLUTE, APPROX, or FIELDTRIP",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get current user location to preserve previous type
      const currentLocation = await tx.userLocation.findUnique({
        where: { empCode },
      });

      if (!currentLocation) {
        return res.status(404).json({
          success: false,
          error: "User location not found",
        });
      }

      const updateData: any = {
        locationType,
        approxLat: null,
        approxLng: null,
        approxRadius: null,
      };

      // Restore defaults when leaving FIELD_TRIP
      if (locationType !== "FIELDTRIP" && currentLocation.locationType === "FIELDTRIP") {
        if (locationType === "APPROX") {
          updateData.approxLat = IIT_GUWAHATI.lat;
          updateData.approxLng = IIT_GUWAHATI.lng;
          updateData.approxRadius = IIT_GUWAHATI.radius;
        }
      }

      if (locationType === "APPROX" && currentLocation.locationType !== "FIELDTRIP") {
        updateData.approxLat = IIT_GUWAHATI.lat;
        updateData.approxLng = IIT_GUWAHATI.lng;
        updateData.approxRadius = IIT_GUWAHATI.radius;
      }

      const userLocation = await tx.userLocation.update({
        where: { empCode },
        data: updateData,
      });

      // Handle field trips
      if (locationType === "FIELDTRIP" && fieldTripDates) {
        // Only deactivate current/future field trips, not historical ones
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await tx.fieldTrip.updateMany({
          where: {
            empCode,
            isActive: true,
            endDate: {
              gte: today // Only deactivate current and future trips
            }
          },
          data: { isActive: false },
        });

        if (fieldTripDates.length > 0) {
          await tx.fieldTrip.createMany({
            data: fieldTripDates.map((trip: any) => ({
              empCode,
              startDate: new Date(trip.startDate),
              endDate: new Date(trip.endDate),
              description: trip.description,
              createdBy: req.body.adminId || "system",
              isActive: true
            }))
          });
        }
      }
      // Don't delete field trips when switching away from FIELDTRIP
      // This preserves the history

      return userLocation;
    });

    res.status(200).json({
      success: true,
      data: result,
      message: "User location updated successfully",
    });
  } catch (error: any) {
    console.error("Update user location error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "User location not found",
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Add a new endpoint to automatically restore location after field trip ends
export const checkAndRestoreLocationAfterFieldTrip = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all users whose field trips have ended
    const expiredFieldTrips = await prisma.fieldTrip.findMany({
      where: {
        isActive: true,
        endDate: {
          lt: today
        }
      },
      include: {
        userLocation: true
      }
    });

    const restoredUsers = [];

    for (const trip of expiredFieldTrips) {
      // Mark the field trip as inactive
      await prisma.fieldTrip.update({
        where: { tripKey: trip.tripKey },
        data: { isActive: false }
      });

      // Check if user still has active field trips
      const activeTrips = await prisma.fieldTrip.count({
        where: {
          empCode: trip.empCode,
          isActive: true,
          startDate: { lte: today },
          endDate: { gte: today }
        }
      });

      // If no active trips remain, restore to ABSOLUTE
      if (activeTrips === 0 && trip.userLocation.locationType === "FIELDTRIP") {
        const updateData: any = {
          locationType: LocationType.ABSOLUTE,
        };

        await prisma.userLocation.update({
          where: { empCode: trip.empCode },
          data: updateData
        });

        restoredUsers.push({
          empCode: trip.empCode,
          restoredTo: LocationType.ABSOLUTE
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${expiredFieldTrips.length} expired field trips`,
      restored: restoredUsers
    });
  } catch (error: any) {
    console.error("Check and restore location error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const saveFieldTrips = async (req: Request, res: Response) => {
  try {
    const { empCode, fieldTripDates } = req.body;

    if (!empCode) {
      return res.status(400).json({
        success: false,
        error: "Employee Code is required",
      });
    }

    if (!Array.isArray(fieldTripDates)) {
      return res.status(400).json({
        success: false,
        error: "Field trip dates must be an array",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // First, deactivate all existing field trips for this user
      await tx.fieldTrip.updateMany({
        where: { empCode, isActive: true },
        data: { isActive: false },
      });

      // Create new field trips if any provided
      if (fieldTripDates.length > 0) {
        const fieldTrips = await Promise.all(
          fieldTripDates.map(async (trip: any) => {
            return await tx.fieldTrip.create({
              data: {
                empCode,
                startDate: new Date(trip.startDate),
                endDate: new Date(trip.endDate),
                description: trip.description || null,
                createdBy: "admin", // You can pass this from the request if needed
                isActive: true,
              },
            });
          })
        );
        return fieldTrips;
      }

      return [];
    });

    res.status(200).json({
      success: true,
      data: result,
      message: "Field trips saved successfully",
    });
  } catch (error: any) {
    console.error("Save field trips error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getFieldTrips = async (req: Request, res: Response) => {
  try {
    const { empCode } = req.params;

    if (!empCode) {
      return res.status(400).json({
        success: false,
        error: "Employee Code is required",
      });
    }

    const fieldTrips = await prisma.fieldTrip.findMany({
      where: {
        empCode,
        isActive: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        fieldTrips,
      },
    });
  } catch (error: any) {
    console.error("Get field trips error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getUserLocationWithFieldTrips = async (req: Request, res: Response) => {
  try {
    const { empCode } = req.params;

    if (!empCode) {
      return res.status(400).json({
        success: false,
        error: "Employee Code is required",
      });
    }

    const userLocation = await prisma.userLocation.findUnique({
      where: { empCode },
      include: {
        user: {
          select: {
            empCode: true,
            username: true,
            email: true,
            location: true,
          },
        },
        fieldTrips: {
          where: {
            isActive: true,
            // Include all active trips, not just future ones
          },
          orderBy: { startDate: "asc" }
        }
      },
    });

    if (!userLocation) {
      return res.status(404).json({
        success: false,
        error: "User location not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...userLocation,
        previousLocationType: null,
        fieldTrips: userLocation.fieldTrips || []
      },
    });
  } catch (error: any) {
    console.error("Get user location error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getUserLocationByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: "Username is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { empCode: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userLocation = await prisma.userLocation.findUnique({
      where: { empCode: user.empCode },
      include: {
        user: {
          select: {
            empCode: true,
            username: true,
            email: true,
            location: true,
          },
        },
        fieldTrips: {
          where: {
            isActive: true,
            // Include all active trips for display
          },
          orderBy: { startDate: 'asc' }
        }
      },
    });

    if (!userLocation) {
      return res.status(200).json({
        success: true,
        data: {
          empCode: user.empCode,
          username,
          locationType: 'ABSOLUTE',
          fieldTrips: []
        },
      });
    }

    res.status(200).json({
      success: true,
      data: userLocation,
    });
  } catch (error: any) {
    console.error("Get user location by username error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const processFieldTripAttendance = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeFieldTrips = await prisma.fieldTrip.findMany({
      where: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        userLocation: {
          include: {
            user: true
          }
        }
      }
    });

    const results = [];
    for (const trip of activeFieldTrips) {
      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          empCode_date: {
            empCode: trip.empCode,
            date: today
          }
        }
      });

      if (!existingAttendance) {
        const attendance = await prisma.attendance.create({
          data: {
            empCode: trip.empCode,
            username: trip.userLocation.user.username,
            takenLocation: "Field Trip",
            date: today,
            checkInTime: new Date(today.getTime() + 9.5 * 60 * 60 * 1000),
            checkOutTime: new Date(today.getTime() + 17.5 * 60 * 60 * 1000),
            sessionType: "FORENOON",
            attendanceType: "FULL_DAY",
            isCheckedOut: true,
          }
        });

        await prisma.attendanceDate.create({
          data: {
            empCode: trip.empCode,
            date: today,
            year: today.getFullYear(),
            month: today.getMonth() + 1,
            day: today.getDate(),
            dayOfWeek: today.getDay(),
            weekOfYear: getWeekOfYear(today),
            isPresent: true,
            attendanceType: "FULL_DAY",
            attendanceRef: attendance.attendanceKey
          }
        });

        results.push({
          empCode: trip.empCode,
          username: trip.userLocation.user.username,
          status: "marked"
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Field trip attendance processed for ${results.length} users`,
      data: results
    });
  } catch (error: any) {
    console.error("Process field trip attendance error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

function getWeekOfYear(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}