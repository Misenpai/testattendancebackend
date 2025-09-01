import type { Request, Response } from "express";
import { PrismaClient, AttendanceSession, LocationType } from "../../generated/prisma/index.js";
import path from "path";
import axios from "axios";

const prisma = new PrismaClient();

// Helper function to get location details from coordinates
async function getLocationDetails(lat: number, lng: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'AttendanceApp/1.0'
      }
    });
    
    const data = response.data;
    return {
      county: data.address?.county || data.address?.city || data.address?.village || null,
      state: data.address?.state || null,
      postcode: data.address?.postcode || null
    };
  } catch (error) {
    console.error('Error fetching location details:', error);
    return { county: null, state: null, postcode: null };
  }
}

// Helper function to determine session type based on time
function getSessionType(time: Date): AttendanceSession {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Forenoon: 9:30 AM (570 mins) to 1:00 PM (780 mins)
  if (timeInMinutes >= 570 && timeInMinutes < 780) {
    return AttendanceSession.FN;
  }
  // Afternoon: 1:00 PM (780 mins) to 5:30 PM (1050 mins)
  else if (timeInMinutes >= 780 && timeInMinutes <= 1050) {
    return AttendanceSession.AF;
  }

  // If outside working hours, determine based on closest session
  if (timeInMinutes < 570) {
    return AttendanceSession.FN; // Early morning counts as forenoon
  }
  return AttendanceSession.AF; // Late evening counts as afternoon
}

export const createAttendance = async (req: Request, res: Response) => {
  try {
    console.log("Received request body:", req.body);
    console.log("Received files:", req.files);

    const {
      username,
      location,
      photoType,
      audioDuration,
      latitude,
      longitude,
      locationType = LocationType.APPROX
    } = req.body;

    if (!username || username === "undefined") {
      console.log("Username is missing or undefined:", username);
      return res
        .status(400)
        .json({ error: "Username is required and cannot be undefined" });
    }

    console.log("Processing attendance for:", {
      username,
      location: location || "Not provided",
      latitude: latitude || "Not provided",
      longitude: longitude || "Not provided",
    });

    const user = await prisma.user.findFirst({
      where: { username },
      include: {
        fieldTrips: {
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is on field trip
    const isOnFieldTrip = user.fieldTrips.length > 0;
    const finalLocationType = isOnFieldTrip ? LocationType.FIELDTRIP : locationType;

    const currentTime = new Date();
    const sessionType = getSessionType(currentTime);

    // Today's date normalized to local midnight
    const today = new Date();
    const localDate = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    // Check if attendance already exists for today
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeNumber: user.employeeNumber,
        attendanceCalendar: {
          day: localDate
        }
      },
      include: {
        attendanceType: true
      }
    });

    if (existingAttendance && existingAttendance.attendanceType?.isCheckout) {
      return res.status(409).json({
        error: "You have already completed your attendance for today.",
        existingAttendance,
      });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const audioFile = files.find((f) => f.mimetype.startsWith("audio/"));

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const photoTypeValue = photoType || "checkin";

    const photoData = files
      .filter((f) => f.mimetype.startsWith("image/"))
      .map((f) => ({
        photoUrl: `${baseUrl}/${path
          .relative(process.cwd(), f.path)
          .replace(/\\/g, "/")}`,
        photoType: photoTypeValue,
      }));

    const audioUrl = audioFile
      ? `${baseUrl}/${path
          .relative(process.cwd(), audioFile.path)
          .replace(/\\/g, "/")}`
      : null;

    const parsedAudioDuration = audioDuration ? parseInt(audioDuration) : null;
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    // Get location details from coordinates
    let locationDetails = { county: null, state: null, postcode: null };
    if (lat && lng) {
      locationDetails = await getLocationDetails(lat, lng);
    }

    // Determine location description
    let takenLocation = location || null;
    if (isOnFieldTrip) {
      takenLocation = "Outside IIT (Field Trip)";
    }

    // Start transaction
    const attendance = await prisma.$transaction(async (tx) => {
      if (existingAttendance && !existingAttendance.attendanceType?.isCheckout) {
        // Re-checkin → update existing record
        const updatedAttendance = await tx.attendance.update({
          where: { attendanceRecordKey: existingAttendance.attendanceRecordKey },
          data: {
            locationType: finalLocationType,
            attendanceType: {
              update: {
                checkinTime: currentTime,
                attendanceGivenTime: sessionType,
                takenLocation
              }
            },
            locationAttendance: {
              upsert: {
                create: {
                  latitude: lat,
                  longitude: lng,
                  county: locationDetails.county,
                  state: locationDetails.state,
                  postcode: locationDetails.postcode
                },
                update: {
                  latitude: lat,
                  longitude: lng,
                  county: locationDetails.county,
                  state: locationDetails.state,
                  postcode: locationDetails.postcode
                }
              }
            },
            photos: {
              deleteMany: {},
              create: photoData,
            },
            ...(audioUrl && {
              audio: {
                deleteMany: {},
                create: [{ audioUrl, duration: parsedAudioDuration }],
              },
            }),
          },
          include: { 
            photos: true, 
            audio: true,
            attendanceType: true,
            locationAttendance: true,
            attendanceCalendar: true
          },
        });
        return updatedAttendance;
      }

      // First check-in of the day → create new attendance
      const newAttendance = await tx.attendance.create({
        data: {
          employeeNumber: user.employeeNumber,
          username: user.username,
          attendanceGiven: true,
          locationType: finalLocationType,
          attendanceCalendar: {
            create: {
              day: localDate,
              present: 1,
              absent: 0
            }
          },
          attendanceType: {
            create: {
              halfDay: sessionType === AttendanceSession.AF,
              fullDay: false,
              isCheckout: false,
              attendanceGivenTime: sessionType,
              checkinTime: currentTime,
              takenLocation
            }
          },
          locationAttendance: {
            create: {
              latitude: lat,
              longitude: lng,
              county: locationDetails.county,
              state: locationDetails.state,
              postcode: locationDetails.postcode
            }
          },
          photos: { create: photoData },
          ...(audioUrl && {
            audio: {
              create: [{ audioUrl, duration: parsedAudioDuration }],
            },
          }),
        },
        include: { 
          photos: true, 
          audio: true,
          attendanceType: true,
          locationAttendance: true,
          attendanceCalendar: true
        },
      });

      return newAttendance;
    });

    res.status(201).json({
      success: true,
      id: attendance.attendanceRecordKey,
      data: {
        ...attendance,
        sessionType,
        message: existingAttendance
          ? `Re-checkin updated for ${sessionType} session.`
          : `Check-in successful for ${sessionType} session. Remember to checkout.`,
      },
    });
  } catch (error: any) {
    console.error("Create attendance error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const checkoutAttendance = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    // Get username from token if available
    const tokenUsername = req.user?.username;
    const finalUsername = username || tokenUsername;

    if (!finalUsername) {
      return res.status(400).json({ error: "Username is required" });
    }

    const user = await prisma.user.findFirst({
      where: { username: finalUsername },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get today's date
    const today = new Date();
    const localDate = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    // Find today's attendance
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeNumber: user.employeeNumber,
        attendanceCalendar: {
          day: localDate
        }
      },
      include: {
        attendanceType: true,
        attendanceCalendar: true
      }
    });

    if (!attendance) {
      return res.status(404).json({
        error: "No check-in found for today. Please check-in first.",
      });
    }

    if (attendance.attendanceType?.isCheckout) {
      return res.status(409).json({
        error: "You have already checked out for today.",
        checkOutTime: attendance.attendanceType.checkoutTime,
      });
    }

    const checkOutTime = new Date();
    const checkInTime = attendance.attendanceType?.checkinTime || new Date();
    const sessionType = attendance.attendanceType?.attendanceGivenTime || AttendanceSession.FN;

    // Determine if it's full day or half day
    const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    const isFullDay = sessionType === AttendanceSession.FN && hoursWorked >= 6;

    // Update attendance with checkout
    const updatedAttendance = await prisma.attendance.update({
      where: { attendanceRecordKey: attendance.attendanceRecordKey },
      data: {
        attendanceType: {
          update: {
            checkoutTime: checkOutTime,
            isCheckout: true,
            fullDay: isFullDay,
            halfDay: !isFullDay
          }
        }
      },
      include: {
        attendanceType: true,
        attendanceCalendar: true,
        locationAttendance: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        ...updatedAttendance,
        message: `Checkout successful. Attendance marked as ${isFullDay ? 'FULL_DAY' : 'HALF_DAY'}.`,
      },
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTodayAttendance = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const user = await prisma.user.findFirst({
      where: { username: username },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get today's date
    const today = new Date();
    const localDate = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeNumber: user.employeeNumber,
        attendanceCalendar: {
          day: localDate
        }
      },
      include: {
        photos: true,
        audio: true,
        attendanceType: true,
        attendanceCalendar: true,
        locationAttendance: true
      },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: "No attendance found for today",
      });
    }

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error: any) {
    console.error("Get today attendance error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUserAttendanceCalendar = async (req: Request, res: Response) => {
  try {
    const { employeeNumber } = req.params;
    const { year, month } = req.query;

    if (!employeeNumber) {
      return res.status(400).json({ error: "Employee Number is required" });
    }

    const queryYear = year ? parseInt(year as string) : new Date().getFullYear();
    const queryMonth = month ? parseInt(month as string) : null;

    let whereCondition: any = {
      employeeNumber: employeeNumber,
    };

    if (queryMonth) {
      const startDate = new Date(queryYear, queryMonth - 1, 1);
      const endDate = new Date(queryYear, queryMonth, 0);
      
      whereCondition.attendanceCalendar = {
        day: {
          gte: startDate,
          lte: endDate
        }
      };
    } else {
      const startDate = new Date(queryYear, 0, 1);
      const endDate = new Date(queryYear, 11, 31);
      
      whereCondition.attendanceCalendar = {
        day: {
          gte: startDate,
          lte: endDate
        }
      };
    }

    const attendances = await prisma.attendance.findMany({
      where: whereCondition,
      include: {
        attendanceCalendar: true,
        attendanceType: true,
        locationAttendance: true
      },
      orderBy: {
        attendanceCalendar: {
          day: 'asc'
        }
      }
    });

    // Calculate statistics
    const totalFullDays = attendances.filter(a => a.attendanceType?.fullDay).length;
    const totalHalfDays = attendances.filter(a => a.attendanceType?.halfDay).length;
    const notCheckedOut = attendances.filter(a => !a.attendanceType?.isCheckout).length;
    const totalDays = totalFullDays + (totalHalfDays * 0.5) + (notCheckedOut * 0.5);

    res.status(200).json({
      success: true,
      data: {
        attendances,
        statistics: {
          totalDays,
          totalFullDays,
          totalHalfDays,
          notCheckedOut,
          year: queryYear,
          month: queryMonth
        }
      }
    });
  } catch (error: any) {
    console.error("Get user attendance calendar error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllUsersWithAttendance = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;

    const queryMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const queryYear = year ? parseInt(year as string) : new Date().getFullYear();

    const startDate = new Date(queryYear, queryMonth - 1, 1);
    const endDate = new Date(queryYear, queryMonth, 0);

    const users = await prisma.user.findMany({
      select: {
        employeeNumber: true,
        username: true,
        empClass: true,
        dateOfResign: true,
        userProjects: {
          include: {
            project: true
          }
        },
        attendances: {
          where: {
            attendanceCalendar: {
              day: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          include: {
            attendanceCalendar: true,
            attendanceType: true,
            locationAttendance: true,
            photos: true,
            audio: true
          },
          orderBy: {
            attendanceCalendar: {
              day: 'desc'
            }
          }
        },
        fieldTrips: {
          where: {
            isActive: true
          }
        }
      },
      orderBy: {
        username: 'asc'
      }
    });

    // Format users with statistics
    const formattedUsers = users.map(user => {
      const fullDays = user.attendances.filter(a => a.attendanceType?.fullDay).length;
      const halfDays = user.attendances.filter(a => a.attendanceType?.halfDay).length;
      const notCheckedOut = user.attendances.filter(a => !a.attendanceType?.isCheckout).length;
      const totalDays = fullDays + (halfDays * 0.5) + (notCheckedOut * 0.5);

      return {
        employeeNumber: user.employeeNumber,
        username: user.username,
        empClass: user.empClass,
        projects: user.userProjects.map(up => ({
          projectCode: up.projectCode,
          department: up.project.department
        })),
        hasActiveFieldTrip: user.fieldTrips.length > 0,
        monthlyStatistics: {
          totalDays,
          fullDays,
          halfDays,
          notCheckedOut
        },
        attendances: user.attendances.map(att => ({
          date: att.attendanceCalendar?.day,
          checkinTime: att.attendanceType?.checkinTime,
          checkoutTime: att.attendanceType?.checkoutTime,
          sessionType: att.attendanceType?.attendanceGivenTime,
          isFullDay: att.attendanceType?.fullDay,
          isHalfDay: att.attendanceType?.halfDay,
          isCheckedOut: att.attendanceType?.isCheckout,
          location: {
            takenLocation: att.attendanceType?.takenLocation,
            latitude: att.locationAttendance?.latitude,
            longitude: att.locationAttendance?.longitude,
            county: att.locationAttendance?.county,
            state: att.locationAttendance?.state,
            postcode: att.locationAttendance?.postcode
          },
          photos: att.photos.map(p => ({
            url: p.photoUrl,
            type: p.photoType
          })),
          audio: att.audio.map(a => ({
            url: a.audioUrl,
            duration: a.duration
          }))
        }))
      };
    });

    res.status(200).json({
      success: true,
      month: queryMonth,
      year: queryYear,
      totalUsers: formattedUsers.length,
      data: formattedUsers
    });
  } catch (error: any) {
    console.error("Get all users error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};