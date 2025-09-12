// src/controllers/hr.controller.ts
import type { Request, Response } from "express";
import { PrismaClient, AttendanceType } from "../../generated/prisma/index.js";
import { generateToken } from "../utils/jwt.js";
import { createObjectCsvStringifier } from "csv-writer";
// Import shared state
import { hrRequests, submittedData } from "../shared/state.js";  // Adjust path if needed

const prisma = new PrismaClient();

const HR_USER = { username: "HRUser", password: "123456" };

export const hrLogin = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (username === HR_USER.username && password === HR_USER.password) {
        const token = generateToken({ employeeNumber: 'HR01', username: 'HRUser', empClass: 'HR' });
        return res.json({ success: true, message: "HR Login Successful", token });
    }
    return res.status(401).json({ success: false, error: "Invalid credentials" });
};

export const getAllPIs = async (req: Request, res: Response) => {
    try {
        const pis = await prisma.pI.findMany({
            select: { username: true },
            orderBy: { username: 'asc' }
        });
        const piUsernames = pis.map(p => p.username);
        return res.json({ success: true, data: piUsernames });
    } catch (error) {
        console.error("Failed to fetch PIs from database:", error);
        return res.status(500).json({ success: false, error: "Could not retrieve PI list." });
    }
};

export const requestDataFromPIs = async (req: Request, res: Response) => {
    const { piUsernames, month, year } = req.body;
    if (!piUsernames || !Array.isArray(piUsernames) || !month || !year) {
        return res.status(400).json({ success: false, error: "PI usernames array, month, and year are required." });
    }

    const requestKey = `${month}-${year}`;
    piUsernames.forEach((pi: string) => {
        if (!hrRequests[pi]) hrRequests[pi] = {};
        hrRequests[pi][requestKey] = { requestedAt: Date.now() };
    });

    console.log("HR Requests Updated:", hrRequests);  // This will now log the shared instance
    return res.json({ success: true, message: `Request sent to ${piUsernames.length} PIs for ${requestKey}` });
};

export const getSubmissionStatus = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ success: false, error: "Month and year are required." });
        }
        const requestKey = `${month}-${year}`;
        const statuses: Record<string, string> = {};

        const pis = await prisma.pI.findMany({ select: { username: true } });
        const piUsernames = pis.map(p => p.username);

        piUsernames.forEach(pi => {
            const hasSubmitted = submittedData[pi] && submittedData[pi][requestKey];  // Now uses shared submittedData
            const hasRequest = hrRequests[pi] && hrRequests[pi][requestKey];  // Now uses shared hrRequests
            const isPending = hasRequest && !hasSubmitted;

            if (hasSubmitted) {
                const isComplete = submittedData[pi][requestKey].length > 0;
                statuses[pi] = isComplete ? 'complete' : 'pending';
            } else if (isPending) {
                statuses[pi] = 'requested';
            } else {
                statuses[pi] = 'none';
            }
        });

        return res.json({ success: true, data: statuses });
    } catch (error) {
        console.error("Failed to get submission statuses:", error);
        return res.status(500).json({ success: false, error: "Could not retrieve submission statuses." });
    }
};

export const downloadReport = async (req: Request, res: Response) => {
    const { piUsernames, month, year } = req.query;
    if (!piUsernames || !month || !year) {
        return res.status(400).json({ success: false, error: "Missing required parameters." });
    }
    const piList = (piUsernames as string).split(',');
    const requestKey = `${month}-${year}`;

    const queryYear = parseInt(year as string);
    const queryMonth = parseInt(month as string);
    const startDate = new Date(Date.UTC(queryYear, queryMonth - 1, 1));
    const endDate = new Date(Date.UTC(queryYear, queryMonth, 0));

    const calendarDays = await prisma.calendar.findMany({ where: { date: { gte: startDate, lte: endDate } } });
    const totalWorkingDays = calendarDays.filter(d => !d.isHoliday && !d.isWeekend).length;

    let allUsersData: any[] = [];
    piList.forEach(pi => {
        if (submittedData[pi]?.[requestKey]) {  // Now uses shared submittedData
            allUsersData = [...allUsersData, ...submittedData[pi][requestKey]];
        }
    });

    if (allUsersData.length === 0) {
        return res.status(404).json({ success: false, error: "No data has been submitted for the selected criteria." });
    }

    const records = allUsersData.map(user => {
        const workingDays = user.monthlyStatistics.totalDays;
        const absentDays = Math.max(0, totalWorkingDays - workingDays);
        return {
            Project_Staff_Name: user.username,
            'Working Days (Present Day)': workingDays.toFixed(1),
            'Absent Days': absentDays.toFixed(1)
        };
    });

    const csvStringifier = createObjectCsvStringifier({
        header: [
            { id: 'Project_Staff_Name', title: 'Project_Staff_Name' },
            { id: 'Working Days (Present Day)', title: 'Working Days (Present Day)' },
            { id: 'Absent Days', title: 'Absent Days' }
        ]
    });

    const csvData = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    const fileName = piList.length > 1 ? `Combined_Report_${month}_${year}.csv` : `${piList[0]}_Report_${month}_${year}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(csvData);
};
root@6466af4f0797:/opt/presencedb/src/controllers# cat pi.controller.ts 
// src/controllers/pi.controller.ts
import type { Request, Response } from "express";
import { PrismaClient, AttendanceType } from "../../generated/prisma/index.js";
// Import shared state
import { hrRequests, submittedData } from "../shared/state.js";  // Adjust path if needed

const prisma = new PrismaClient();

export const getPIUsersAttendanceSSO = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    const { username, projectCodes } = req.body;  // Already using req.body for SSO

    if (!username || !projectCodes || !Array.isArray(projectCodes)) {
      return res.status(400).json({
        success: false,
        error: "Invalid SSO data",
      });
    }

    const queryMonth = month
      ? parseInt(month as string)
      : new Date().getMonth() + 1;
    const queryYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    const startDate = new Date(queryYear, queryMonth - 1, 1);
    const endDate = new Date(queryYear, queryMonth, 0);

    const users = await prisma.user.findMany({
      where: {
        userProjects: {
          some: {
            projectCode: {
              in: projectCodes,
            },
          },
        },
      },
      include: {
        userProjects: {
          include: {
            project: true,
          },
          where: {
            projectCode: {
              in: projectCodes,
            },
          },
        },
        attendances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            date: "desc",
          },
        },
        fieldTrips: {
          where: {
            isActive: true,
          },
        },
      },
      orderBy: {
        username: "asc",
      },
    });

    const formattedUsers = users.map((user) => {
      const fullDays = user.attendances.filter(
        (a) => a.attendanceType === AttendanceType.FULL_DAY,
      ).length;
      const halfDays = user.attendances.filter(
        (a) => a.attendanceType === AttendanceType.HALF_DAY,
      ).length;
      const notCheckedOut = user.attendances.filter(
        (a) => !a.checkoutTime,
      ).length;
      const totalDays = fullDays + halfDays * 0.5 + notCheckedOut * 0.5;

      return {
        employeeNumber: user.employeeNumber,
        username: user.username,
        empClass: user.empClass,
        projects: user.userProjects.map((up) => ({
          projectCode: up.projectCode,
          department: up.project.department,
        })),
        hasActiveFieldTrip: user.fieldTrips.length > 0,
        monthlyStatistics: {
          totalDays,
          fullDays,
          halfDays,
          notCheckedOut,
        },
        attendances: user.attendances.map((att) => ({
          date: att.date,
          checkinTime: att.checkinTime,
          checkoutTime: att.checkoutTime,
          sessionType: att.sessionType,
          attendanceType: att.attendanceType,
          isFullDay: att.attendanceType === AttendanceType.FULL_DAY,
          isHalfDay: att.attendanceType === AttendanceType.HALF_DAY,
          isCheckedOut: !!att.checkoutTime,
          takenLocation: att.takenLocation,
          location: {
            takenLocation: att.takenLocation,
            latitude: att.latitude,
            longitude: att.longitude,
            county: att.county,
            state: att.state,
            postcode: att.postcode,
            address:
              att.locationAddress ||
              (att.county || att.state || att.postcode
                ? `${att.county || ""}, ${att.state || ""}, ${att.postcode || ""}`
                    .replace(/^, |, , |, $/g, "")
                    .trim()
                : null),
          },
          photo: att.photoUrl
            ? {
                url: att.photoUrl,
              }
            : null,
          audio: att.audioUrl
            ? {
                url: att.audioUrl,
                duration: att.audioDuration,
              }
            : null,
        })),
      };
    });

    res.status(200).json({
      success: true,
      month: queryMonth,
      year: queryYear,
      totalUsers: formattedUsers.length,
      data: formattedUsers,
    });
  } catch (error: any) {
    console.error("Get PI users attendance error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getPIUsersAttendance = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const { username, projects, projectCode } = req.user;
    const userProjects = projects || [projectCode];

    const queryMonth = month
      ? parseInt(month as string)
      : new Date().getMonth() + 1;
    const queryYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    const startDate = new Date(queryYear, queryMonth - 1, 1);
    const endDate = new Date(queryYear, queryMonth, 0);

    const users = await prisma.user.findMany({
      where: {
        userProjects: {
          some: {
            projectCode: {
              in: userProjects,
            },
          },
        },
      },
      include: {
        userProjects: {
          include: {
            project: true,
          },
          where: {
            projectCode: {
              in: userProjects,
            },
          },
        },
        attendances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            date: "desc",
          },
        },
        fieldTrips: {
          where: {
            isActive: true,
          },
        },
      },
      orderBy: {
        username: "asc",
      },
    });

    const formattedUsers = users.map((user) => {
      const fullDays = user.attendances.filter(
        (a) => a.attendanceType === AttendanceType.FULL_DAY,
      ).length;
      const halfDays = user.attendances.filter(
        (a) => a.attendanceType === AttendanceType.HALF_DAY,
      ).length;
      const notCheckedOut = user.attendances.filter(
        (a) => !a.checkoutTime,
      ).length;
      const totalDays = fullDays + halfDays * 0.5 + notCheckedOut * 0.5;

      return {
        employeeNumber: user.employeeNumber,
        username: user.username,
        empClass: user.empClass,
        projects: user.userProjects.map((up) => ({
          projectCode: up.projectCode,
          department: up.project.department,
        })),
        hasActiveFieldTrip: user.fieldTrips.length > 0,
        monthlyStatistics: {
          totalDays,
          fullDays,
          halfDays,
          notCheckedOut,
        },
        attendances: user.attendances.map((att) => ({
          date: att.date,
          checkinTime: att.checkinTime,
          checkoutTime: att.checkoutTime,
          sessionType: att.sessionType,
          attendanceType: att.attendanceType,
          isFullDay: att.attendanceType === AttendanceType.FULL_DAY,
          isHalfDay: att.attendanceType === AttendanceType.HALF_DAY,
          isCheckedOut: !!att.checkoutTime,
          takenLocation: att.takenLocation,
          location: {
            takenLocation: att.takenLocation,
            latitude: att.latitude,
            longitude: att.longitude,
            county: att.county,
            state: att.state,
            postcode: att.postcode,
            address:
              att.locationAddress ||
              (att.county || att.state || att.postcode
                ? `${att.county || ""}, ${att.state || ""}, ${att.postcode || ""}`
                    .replace(/^, |, , |, $/g, "")
                    .trim()
                : null),
          },
          photo: att.photoUrl
            ? {
                url: att.photoUrl,
              }
            : null,
          audio: att.audioUrl
            ? {
                url: att.audioUrl,
                duration: att.audioDuration,
              }
            : null,
        })),
      };
    });

    res.status(200).json({
      success: true,
      month: queryMonth,
      year: queryYear,
      totalUsers: formattedUsers.length,
      data: formattedUsers,
    });
  } catch (error: any) {
    console.error("Get PI users attendance error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getPiNotifications = async (req: Request, res: Response) => {
  const piUsername = req.user?.username;
  if (!piUsername) {
    return res.status(401).json({ success: false, error: "Unauthorized PI" });
  }
  const notifications = hrRequests[piUsername] ?
    Object.keys(hrRequests[piUsername]).map(key => {
      const [month, year] = key.split('-');
      return { month, year };
    }) : [];
  return res.json({ success: true, data: notifications });
};

export const submitDataToHR = async (req: Request, res: Response) => {
  try {
    const piUsername = req.user?.username;
    const piProjects = req.user?.projects || (req.user?.projectCode ? [req.user.projectCode] : []);

    if (!piUsername || piProjects.length === 0) {
      return res.status(401).json({ success: false, error: "Unauthorized PI or no projects associated" });
    }

    const { month, year } = req.body;
    const requestKey = `${month}-${year}`;

    if (!hrRequests[piUsername]?.[requestKey]) {
      return res.status(404).json({ success: false, error: "No active data request found from HR for this period." });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const users = await prisma.user.findMany({
      where: { userProjects: { some: { projectCode: { in: piProjects } } } },
      include: {
        attendances: { where: { date: { gte: startDate, lte: endDate } } }
      }
    });

    const formattedUsers = users.map(user => {
      const fullDays = user.attendances.filter(a => a.attendanceType === AttendanceType.FULL_DAY).length;
      const halfDays = user.attendances.filter(a => a.attendanceType === AttendanceType.HALF_DAY).length;
      const notCheckedOut = user.attendances.filter(a => !a.checkoutTime).length;
      return {
        username: user.username,
        monthlyStatistics: {
          totalDays: fullDays + (halfDays * 0.5) + (notCheckedOut * 0.5),
        }
      };
    });

    if (!submittedData[piUsername]) submittedData[piUsername] = {};
    submittedData[piUsername][requestKey] = formattedUsers;
    delete hrRequests[piUsername][requestKey];

    console.log(`Data submitted by PI: ${piUsername} for ${requestKey}`);
    return res.json({ success: true, message: `Attendance data for ${month}/${year} submitted to HR successfully.` });
  } catch (error: any) {
    console.error("Submit data to HR error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};