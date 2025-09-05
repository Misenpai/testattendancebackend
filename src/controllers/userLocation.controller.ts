import type { Request, Response } from "express";
import { PrismaClient, LocationType, AttendanceType, AttendanceSession } from "../../generated/prisma/index.js";

const prisma = new PrismaClient();

// Helper to get today's date normalized to midnight UTC
function getTodayDate(): Date {
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
}

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
                startDate: new Date(trip.startDate),
                endDate: new Date(trip.endDate),
                description: trip.description || null,
                createdBy: req.user?.username || "admin", // Use authenticated user or default to admin
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

    // Determine location type - if on field trip, use FIELDTRIP, otherwise CAMPUS
    const locationType = isOnFieldTrip ? "FIELDTRIP" : "CAMPUS";

    res.status(200).json({
      success: true,
      data: {
        employeeNumber: user.employeeNumber,
        username: user.username,
        empClass: user.empClass,
        locationType: locationType,
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
    const today = getTodayDate();

    // Find all active field trips for today
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
      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          employeeNumber_date: {
            employeeNumber: trip.employeeNumber,
            date: today
          }
        }
      });

      if (!existingAttendance) {
        // Create attendance record for field trip (auto mark as full day)
        const attendance = await prisma.attendance.create({
          data: {
            employeeNumber: trip.employeeNumber,
            date: today,
            checkinTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30), // 9:30 AM
            checkoutTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 30), // 5:30 PM
            sessionType: AttendanceSession.FN,
            attendanceType: AttendanceType.FULL_DAY,
            locationType: LocationType.FIELDTRIP,
            takenLocation: "Field Trip - " + (trip.description || "Auto-marked")
          }
        });

        results.push({
          employeeNumber: trip.employeeNumber,
          username: trip.user.username,
          status: "marked",
          attendanceId: attendance.employeeNumber + "_" + attendance.date.toISOString()
        });
      } else {
        results.push({
          employeeNumber: trip.employeeNumber,
          username: trip.user.username,
          status: "already_marked"
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

// Additional helper endpoints

export const deleteFieldTrip = async (req: Request, res: Response) => {
  try {
    const { fieldTripKey } = req.params;

    if (!fieldTripKey) {
      return res.status(400).json({
        success: false,
        error: "Field trip key is required",
      });
    }

    // Soft delete by setting isActive to false
    const updatedFieldTrip = await prisma.fieldTrip.update({
      where: { fieldTripKey },
      data: { isActive: false }
    });

    res.status(200).json({
      success: true,
      message: "Field trip deleted successfully",
      data: updatedFieldTrip
    });
  } catch (error: any) {
    console.error("Delete field trip error:", error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: "Field trip not found"
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getAllActiveFieldTrips = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const activeFieldTrips = await prisma.fieldTrip.findMany({
      where: {
        isActive: true,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      },
      include: {
        user: {
          select: {
            employeeNumber: true,
            username: true,
            empClass: true
          }
        }
      },
      orderBy: [
        { startDate: 'asc' },
        { employeeNumber: 'asc' }
      ]
    });

    const formattedTrips = activeFieldTrips.map(trip => ({
      fieldTripKey: trip.fieldTripKey,
      employeeNumber: trip.employeeNumber,
      username: trip.user.username,
      empClass: trip.user.empClass,
      startDate: trip.startDate,
      endDate: trip.endDate,
      description: trip.description,
      createdBy: trip.createdBy,
      daysRemaining: Math.ceil((trip.endDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
    }));

    res.status(200).json({
      success: true,
      date: targetDate,
      totalActiveTrips: formattedTrips.length,
      data: formattedTrips
    });
  } catch (error: any) {
    console.error("Get all active field trips error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateFieldTrip = async (req: Request, res: Response) => {
  try {
    const { fieldTripKey } = req.params;
    const { startDate, endDate, description } = req.body;

    if (!fieldTripKey) {
      return res.status(400).json({
        success: false,
        error: "Field trip key is required",
      });
    }

    const updateData: any = {};
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (description !== undefined) updateData.description = description;

    const updatedFieldTrip = await prisma.fieldTrip.update({
      where: { fieldTripKey },
      data: updateData,
      include: {
        user: {
          select: {
            employeeNumber: true,
            username: true,
            empClass: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: "Field trip updated successfully",
      data: updatedFieldTrip
    });
  } catch (error: any) {
    console.error("Update field trip error:", error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: "Field trip not found"
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};