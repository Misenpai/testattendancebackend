import type { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma/index.js';
import { createUserFolder } from '../utils/folderUtils.js';
import { generateToken } from '../utils/jwt.js';
import { getiitAuthService } from '../services/iitAuthService.js';

const prisma = new PrismaClient();

export const loginUserIIT = async (req: Request, res: Response) => {
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

    // Step 2: Since IIT authentication passed, user is valid
    // Check if user exists in local database for profile data, if not create basic entry
    let user = await prisma.user.findUnique({
      where: { username: username },
      include: {
        userLocation: true
      }
    });

    // If user doesn't exist locally, create a basic profile
    if (!user) {
      console.log(`[IIT-Login] Creating local profile for IIT user: ${username}`);
      
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            empCode: username, // Using username as empCode for now
            username: username.trim(),
            email: `${username}@iitg.ac.in`, // Default IIT email
            password: 'IIT_MANAGED', // Placeholder since IIT manages passwords
            location: 'all',
            role: 'USER',
            isActive: true
          },
          include: {
            userLocation: true
          }
        });

        await tx.userLocation.create({
          data: {
            empCode: username,
            username: username.trim(),
            locationType: 'ABSOLUTE'
          }
        });

        return await tx.user.findUnique({
          where: { empCode: username },
          include: {
            userLocation: true
          }
        });
      });

      console.log(`[IIT-Login] Local profile created for: ${username}`);
    }

    // Check if user is active (only relevant for existing local users)
    if (!user!.isActive) {
      return res.status(401).json({ 
        success: false, 
        error: "Account is deactivated. Please contact administrator." 
      });
    }

    createUserFolder(user!.username);

    // Generate JWT token
    const token = generateToken({
      userKey: user!.userKey,
      empCode: user!.empCode,
      username: user!.username,
      email: user!.email
    });

    const { password: _, ...userWithoutPassword } = user!;

    res.status(200).json({ 
      success: true, 
      userId: user!.userKey,
      empCode: user!.empCode,
      username: user!.username,
      user: {
        ...userWithoutPassword,
        userKey: user!.userKey,
        id: user!.empCode
      },
      token,
      message: "Login successful (IIT Verified)"
    });

  } catch (error: any) {
    console.error("IIT Login user error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Keep syncUserFromIIT for manual admin operations (if needed)
export const syncUserFromIIT = async (req: Request, res: Response) => {
  try {
    const { username, empCode, email, location } = req.body;
    
    if (!username || !empCode) {
      return res.status(400).json({ 
        success: false, 
        error: "Username and empCode are required" 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { empCode: empCode.trim() },
          { username: username.trim() }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: "User already exists in local database" 
      });
    }

    // Create user entry for admin purposes
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          empCode: empCode.trim(),
          username: username.trim(),
          email: email?.toLowerCase().trim() || `${username}@iitg.ac.in`,
          password: 'IIT_MANAGED',
          location: location || 'all',
        },
        include: {
          userLocation: true
        }
      });

      await tx.userLocation.create({
        data: {
          empCode: empCode.trim(),
          username: username.trim(),
          locationType: 'ABSOLUTE'
        }
      });

      return await tx.user.findUnique({
        where: { empCode: empCode.trim() },
        include: {
          userLocation: true
        }
      });
    });

    createUserFolder(user!.username);

    const { password: _, ...userWithoutPassword } = user!;

    res.status(201).json({
      success: true, 
      message: "User synced from IIT successfully",
      user: userWithoutPassword
    });

  } catch (error: any) {
    console.error("Sync user from IIT error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const testIITConnection = async (req: Request, res: Response) => {
  try {
    const iitAuth = getiitAuthService();
    const isConnected = await iitAuth.testConnection();
    
    res.status(200).json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'IIT backend is reachable' : 'IIT backend is not reachable'
    });

  } catch (error: any) {
    console.error("Test IIT connection error:", error);
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
};