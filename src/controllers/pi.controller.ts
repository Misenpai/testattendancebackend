import type { Request, Response } from 'express';
import { PrismaClient, AttendanceType } from '../../generated/prisma/index.js';
import { generateToken } from '../utils/jwt.js';

const prisma = new PrismaClient();

export const loginPI = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find PI user
    const pi = await prisma.pI.findUnique({
      where: { username },
      include: {
        piProjects: {
          include: {
            project: true
          }
        }
      }
    });

    if (!pi || pi.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const token = generateToken({
      employeeNumber: pi.principalInvestigatorKey,
      username: pi.username,
      empClass: 'PI'
    });

    const projects = pi.piProjects.map(pp => pp.projectCode);

    res.status(200).json({
      success: true,
      username: pi.username,
      projectCode: pi.projectCode,
      projects,
      token,
      message: 'Login successful'
    });

  } catch (error: any) {
    console.error('PI login error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getPIUsersAttendance = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    const piUsername = req.user?.username;

    if (!piUsername) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get PI's projects
    const pi = await prisma.pI.findUnique({
      where: { username: piUsername },
      include: {
        piProjects: true
      }
    });

    if (!pi) {
      return res.status(404).json({
        success: false,
        error: 'PI not found'
      });
    }

    const projectCodes = pi.piProjects.map(pp => pp.projectCode);

    const queryMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const queryYear = year ? parseInt(year as string) : new Date().getFullYear();

    const startDate = new Date(queryYear, queryMonth - 1, 1);
    const endDate = new Date(queryYear, queryMonth, 0);

    // Get users working on PI's projects
    const users = await prisma.user.findMany({
      where: {
        userProjects: {
          some: {
            projectCode: {
              in: projectCodes
            }
          }
        }
      },
      include: {
        userProjects: {
          include: {
            project: true
          },
          where: {
            projectCode: {
              in: projectCodes
            }
          }
        },
        attendances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: {
            date: 'desc'
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

    // Format response with location details
    const formattedUsers = users.map(user => {
      const fullDays = user.attendances.filter(a => a.attendanceType === AttendanceType.FULL_DAY).length;
      const halfDays = user.attendances.filter(a => a.attendanceType === AttendanceType.HALF_DAY).length;
      const notCheckedOut = user.attendances.filter(a => !a.checkoutTime).length;
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
            address: att.locationAddress || 
              (att.county || att.state || att.postcode ? 
                `${att.county || ''}, ${att.state || ''}, ${att.postcode || ''}`.replace(/^, |, , |, $/g, '').trim() 
                : null)
          },
          photo: att.photoUrl ? {
            url: att.photoUrl
          } : null,
          audio: att.audioUrl ? {
            url: att.audioUrl,
            duration: att.audioDuration
          } : null
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
    console.error('Get PI users attendance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};