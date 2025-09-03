// src/controllers/pi.controller.ts
import type { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma/index.js';
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

    // Format response
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
          takenLocation: att.attendanceType?.takenLocation,
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
    console.error('Get PI users attendance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};