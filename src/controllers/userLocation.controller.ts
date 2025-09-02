import type { Request, Response } from "express";
import { PrismaClient, LocationType } from "../../generated/prisma/index.js";

const prisma = new PrismaClient();

export const saveFieldTrips = async (req: Request, res: Response) => {
  try {
    const { employeeNumber, fieldTripDates } = req.body;

    if (!employeeNumber) {
      return res.status(400).json({
        success: false,
        error: "Employee Number is required",
      });
    }

    if (!Array.isArray(fieldTripDates)) {
      return res.status(400).json({
        success: false,
        error: "Field trip dates must be an array",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { employeeNumber }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // First, deactivate all existing active field trips for this user
      await tx.fieldTrip.updateMany({
        where: { 
          employeeNumber, 
          isActive: true 
        },
        data: { isActive: false },
      });

      // Create new field trips if any provided
      if (fieldTripDates.length > 0) {
        const fieldTrips = await Promise.all(
          fieldTripDates.map(async (trip: any) => {
            return await tx.fieldTrip.create({
              data: {
                employeeNumber,
                username: user.username,
                startDate: new Date(trip.startDate),
                endDate: new Date(trip.endDate),
                description: trip.description || null,
                createdBy: "admin",
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
    const { employeeNumber } = req.params;

    if (!employeeNumber) {
      return res.status(400).json({
        success: false,
        error: "Employee Number is required",
      });
    }

    const fieldTrips = await prisma.fieldTrip.findMany({
      where: {
        employeeNumber,
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

export const getUserFieldTrips = async (req: Request, res: Response) => {
  try {
    const { employeeNumber } = req.params;

    if (!employeeNumber) {
      return res.status(400).json({
        success: false,
        error: "Employee Number is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { employeeNumber },
      include: {
        fieldTrips: {
          where: {
            isActive: true,
          },
          orderBy: { startDate: "asc" }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        employeeNumber: user.employeeNumber,
        username: user.username,
        empClass: user.empClass,
        fieldTrips: user.fieldTrips || []
      },
    });
  } catch (error: any) {
    console.error("Get user field trips error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getUserFieldTripsByUsername = async (req: Request, res: Response) => {
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
      include: {
        fieldTrips: {
          where: {
            isActive: true,
          },
          orderBy: { startDate: 'asc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Check if user is currently on a field trip
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOnFieldTrip = user.fieldTrips.some(trip => {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return today >= start && today <= end && trip.isActive;
    });

    // Determine location type - if on field trip, use FIELDTRIP, otherwise default to ABSOLUTE
    const locationType = isOnFieldTrip ? "FIELDTRIP" : "ABSOLUTE";

    res.status(200).json({
      success: true,
      data: {
        employeeNumber: user.employeeNumber,
        username: user.username,
        empClass: user.empClass,
        locationType: locationType, // Add this field
        fieldTrips: user.fieldTrips || []
      },
    });
  } catch (error: any) {
    console.error("Get user field trips by username error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const checkAndDeactivateExpiredFieldTrips = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all field trips that have ended
    const expiredFieldTrips = await prisma.fieldTrip.findMany({
      where: {
        isActive: true,
        endDate: {
          lt: today
        }
      }
    });

    const deactivatedTrips = [];

    for (const trip of expiredFieldTrips) {
      await prisma.fieldTrip.update({
        where: { fieldTripKey: trip.fieldTripKey },
        data: { isActive: false }
      });

      deactivatedTrips.push({
        employeeNumber: trip.employeeNumber,
        username: trip.username,
        tripKey: trip.fieldTripKey,
        endDate: trip.endDate
      });
    }

    res.status(200).json({
      success: true,
      message: `Deactivated ${expiredFieldTrips.length} expired field trips`,
      deactivated: deactivatedTrips
    });
  } catch (error: any) {
    console.error("Check and deactivate expired field trips error:", error);
    res.status(500).json({
      success: false,
      error: error.message
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
        user: true
      }
    });

    const results = [];
    for (const trip of activeFieldTrips) {
      // Check if attendance already exists for today
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          employeeNumber: trip.employeeNumber,
          attendanceCalendar: {
            day: today
          }
        }
      });

      if (!existingAttendance) {
        // Create attendance record for field trip
        const attendance = await prisma.attendance.create({
          data: {
            employeeNumber: trip.employeeNumber,
            username: trip.username,
            attendanceGiven: true,
            locationType: "FIELDTRIP",
            attendanceCalendar: {
              create: {
                day: today,
                present: 1,
                absent: 0
              }
            },
            attendanceType: {
              create: {
                fullDay: true,
                attendanceGivenTime: "FN",
                takenLocation: "Field Trip"
              }
            }
          }
        });

        results.push({
          employeeNumber: trip.employeeNumber,
          username: trip.username,
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