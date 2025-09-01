import type { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma/index.js';
import { generateToken } from '../utils/jwt.js';
import { getiitAuthService } from '../services/iitAuthService.js';

const prisma = new PrismaClient();

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "Username and password are required" 
      });
    }

    // Step 1: Authenticate with IIT backend
    try {
      console.log(`[IIT-Login] Verifying credentials with IIT backend for: ${username}`);
      const iitAuth = getiitAuthService();
      const authResult = await iitAuth.authenticateUser({ username, password });

      if (!authResult.success || !authResult.valid) {
        console.log(`[IIT-Login] IIT authentication failed for: ${username}`);
        return res.status(401).json({ 
          success: false, 
          error: "Invalid username or password" 
        });
      }

      console.log(`[IIT-Login] IIT authentication successful for: ${username}`);
    } catch (error: any) {
      console.error('[IIT-Login] IIT authentication error:', error.message);
      return res.status(503).json({ 
        success: false, 
        error: "Authentication service unavailable. Please try again later." 
      });
    }

    // Step 2: Check if user exists in local database
    let user = await prisma.user.findUnique({
      where: { username: username },
      include: {
        userProjects: {
          include: {
            project: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please contact administrator." 
      });
    }

    // Check if user has resigned
    if (user.dateOfResign && user.dateOfResign <= new Date()) {
      return res.status(401).json({ 
        success: false, 
        error: "Access denied. User has resigned." 
      });
    }

    // Generate JWT token
    const token = generateToken({
      employeeNumber: user.employeeNumber,
      username: user.username,
      empClass: user.empClass
    });

    res.status(200).json({ 
      success: true, 
      employeeNumber: user.employeeNumber,
      username: user.username,
      empClass: user.empClass,
      projects: user.userProjects.map(up => ({
        projectCode: up.projectCode,
        department: up.project.department
      })),
      token,
      message: "Login successful"
    });

  } catch (error: any) {
    console.error("Login user error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { employeeNumber } = req.params;

    if (!employeeNumber) {
      return res.status(400).json({
        success: false,
        error: "Employee Number is required"
      });
    }

    const user = await prisma.user.findUnique({
      where: { employeeNumber },
      select: {
        employeeNumber: true,
        username: true,
        empClass: true,
        dateOfResign: true,
        userProjects: {
          select: {
            projectCode: true,
            project: {
              select: {
                department: true
              }
            }
          }
        },
        attendances: {
          take: 10,
          orderBy: {
            attendanceCalendar: {
              day: 'desc'
            }
          },
          include: {
            attendanceCalendar: true,
            attendanceType: true,
            locationAttendance: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error: any) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};