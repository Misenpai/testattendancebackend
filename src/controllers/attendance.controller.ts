import type { Request, Response } from "express";
import { PrismaClient, AttendanceSession, AttendanceType, LocationType } from "../../generated/prisma/index.js";
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
      locationAddress: data.display_name || null,
      county: data.address?.county || data.address?.city || data.address?.village || null,
      state: data.address?.state || null,
      postcode: data.address?.postcode || null
    };
  } catch (error) {
    console.error('Error fetching location details:', error);
    return { locationAddress: null, county: null, state: null, postcode: null };
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

// Helper function to determine attendance type
function determineAttendanceType(checkinTime: Date, checkoutTime: Date | null, sessionType: AttendanceSession): AttendanceType | null {
  if (!checkoutTime) {
    // If not checked out yet, we can't determine the type
    return null;
  }
  
  const hoursWorked = (checkoutTime.getTime() - checkinTime.getTime()) / (1000 * 60 * 60);
  
  // Full day if checked in during FN and worked >= 6 hours
  if (sessionType === AttendanceSession.FN && hoursWorked >= 6) {
    return AttendanceType.FULL_DAY;
  }
  
  return AttendanceType.HALF_DAY;
}

// Helper to get today's date normalized to midnight UTC
function getTodayDate(): Date {
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
}

export const createAttendance = async (req: Request, res: Response) => {
  try {
    console.log("Received request body:", req.body);
    console.log("Received files:", req.files);

    const {
      username,
      location,
      audioDuration,
      latitude,
      longitude,
      locationType = LocationType.CAMPUS,
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
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is on field trip
    const isOnFieldTrip = user.fieldTrips.length > 0;
    const finalLocationType = isOnFieldTrip
      ? LocationType.FIELDTRIP
      : locationType;

    const currentTime = new Date();
    const sessionType = getSessionType(currentTime);
    const todayDate = getTodayDate();

    // Check if attendance already exists for today
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeNumber_date: {
          employeeNumber: user.employeeNumber,
          date: todayDate
        }
      }
    });

    if (existingAttendance && existingAttendance.checkoutTime) {
      return res.status(409).json({
        error: "You have already completed your attendance for today.",
        existingAttendance,
      });
    }

    // Process uploaded files
    const files = (req.files as Express.Multer.File[]) || [];
    const audioFile = files.find((f) => f.mimetype.startsWith("audio/"));
    const photoFile = files.find((f) => f.mimetype.startsWith("image/"));

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    
    const photoUrl = photoFile
      ? `${baseUrl}/${path.relative(process.cwd(), photoFile.path).replace(/\\/g, "/")}`
      : null;
      
    const audioUrl = audioFile
      ? `${baseUrl}/${path.relative(process.cwd(), audioFile.path).replace(/\\/g, "/")}`
      : null;

    const parsedAudioDuration = audioDuration ? parseInt(audioDuration) : null;
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    // Get location details from coordinates
    let locationDetails = { locationAddress: null, county: null, state: null, postcode: null };
    if (lat && lng) {
      locationDetails = await getLocationDetails(lat, lng);
    }

    // Determine location description
    let takenLocation = location || null;
    if (isOnFieldTrip) {
      takenLocation = "Outside IIT (Field Trip)";
    }

    if (existingAttendance && !existingAttendance.checkoutTime) {
      // Re-checkin → update existing record
      const updatedAttendance = await prisma.attendance.update({
        where: {
          employeeNumber_date: {
            employeeNumber: user.employeeNumber,
            date: todayDate
          }
        },
        data: {
          checkinTime: currentTime,
          sessionType,
          locationType: finalLocationType,
          takenLocation,
          photoUrl,
          audioUrl,
          audioDuration: parsedAudioDuration,
          latitude: lat,
          longitude: lng,
          locationAddress: locationDetails.locationAddress,
          county: locationDetails.county,
          state: locationDetails.state,
          postcode: locationDetails.postcode,
        }
      });

      return res.status(200).json({
        success: true,
        data: updatedAttendance,
        message: `Re-checkin updated for ${sessionType} session.`
      });
    }

    // First check-in of the day → create new attendance
    const newAttendance = await prisma.attendance.create({
      data: {
        employeeNumber: user.employeeNumber,
        date: todayDate,
        checkinTime: currentTime,
        sessionType,
        locationType: finalLocationType,
        takenLocation,
        photoUrl,
        audioUrl,
        audioDuration: parsedAudioDuration,
        latitude: lat,
        longitude: lng,
        locationAddress: locationDetails.locationAddress,
        county: locationDetails.county,
        state: locationDetails.state,
        postcode: locationDetails.postcode,
        // attendanceType will be determined at checkout
      }
    });

    res.status(201).json({
      success: true,
      data: newAttendance,
      message: `Check-in successful for ${sessionType} session. Remember to checkout.`,
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

    const todayDate = getTodayDate();

    // Find today's attendance
    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeNumber_date: {
          employeeNumber: user.employeeNumber,
          date: todayDate
        }
      }
    });

    if (!attendance) {
      return res.status(404).json({
        error: "No check-in found for today. Please check-in first.",
      });
    }

    if (attendance.checkoutTime) {
      return res.status(409).json({
        error: "You have already checked out for today.",
        checkOutTime: attendance.checkoutTime,
      });
    }

    const checkOutTime = new Date();
    const checkInTime = attendance.checkinTime || new Date();
    const sessionType = attendance.sessionType || AttendanceSession.FN;

    // Determine attendance type
    const attendanceType = determineAttendanceType(checkInTime, checkOutTime, sessionType);

    // Update attendance with checkout
    const updatedAttendance = await prisma.attendance.update({
      where: {
        employeeNumber_date: {
          employeeNumber: user.employeeNumber,
          date: todayDate
        }
      },
      data: {
        checkoutTime: checkOutTime,
        attendanceType: attendanceType || AttendanceType.HALF_DAY
      }
    });

    const finalType = attendanceType || AttendanceType.HALF_DAY;
    res.status(200).json({
      success: true,
      data: updatedAttendance,
      message: `Checkout successful. Attendance marked as ${finalType}.`,
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
      where: { username },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const todayDate = getTodayDate();

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeNumber_date: {
          employeeNumber: user.employeeNumber,
          date: todayDate
        }
      }
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
      
      whereCondition.date = {
        gte: startDate,
        lte: endDate
      };
    } else {
      const startDate = new Date(queryYear, 0, 1);
      const endDate = new Date(queryYear, 11, 31);
      
      whereCondition.date = {
        gte: startDate,
        lte: endDate
      };
    }

    const attendances = await prisma.attendance.findMany({
      where: whereCondition,
      orderBy: {
        date: 'asc'
      }
    });

    // Calculate statistics
    const totalFullDays = attendances.filter(a => a.attendanceType === AttendanceType.FULL_DAY).length;
    const totalHalfDays = attendances.filter(a => a.attendanceType === AttendanceType.HALF_DAY).length;
    const notCheckedOut = attendances.filter(a => !a.checkoutTime).length;
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
