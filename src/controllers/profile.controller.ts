import type { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { empCode } = req.params;

    if (!empCode) {
      return res.status(400).json({
        success: false,
        error: "Employee Code is required"
      });
    }

    const user = await prisma.user.findUnique({
      where: { empCode: empCode },
      select: {
        empCode: true,
        username: true,
        email: true,
        location: true,
        createdAt: true,
        updatedAt: true
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
      data: {
        empCode: user.empCode,
        username: user.username,
        email: user.email,
        location: user.location,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error: any) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getUserProfileByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: "Username is required"
      });
    }

    const user = await prisma.user.findUnique({
      where: { username: username },
      select: {
        empCode: true,
        username: true,
        email: true,
        location: true,
        createdAt: true,
        updatedAt: true
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
      data: {
        empCode: user.empCode,
        username: user.username,
        email: user.email,
        location: user.location,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error: any) {
    console.error("Get user profile by username error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { empCode } = req.params;
    const { email, location } = req.body;

    if (!empCode) {
      return res.status(400).json({
        success: false,
        error: "Employee Code is required"
      });
    }

    const updateUserData: any = {};
    if (email) updateUserData.email = email.toLowerCase().trim();
    if (location !== undefined) updateUserData.location = location;

    if (Object.keys(updateUserData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one field (email or location) is required for update"
      });
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { email: email.toLowerCase().trim() },
            { NOT: { empCode: empCode } }
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: "Email is already taken by another user"
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { empCode: empCode },
      data: updateUserData,
      select: {
        empCode: true,
        username: true,
        email: true,
        location: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        empCode: updatedUser.empCode,
        username: updatedUser.username,
        email: updatedUser.email,
        location: updatedUser.location,
        updatedAt: updatedUser.updatedAt
      },
      message: "Profile updated successfully"
    });

  } catch (error: any) {
    console.error("Update user profile error:", error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateUserLocation = async (req: Request, res: Response) => {
  try {
    const { empCode } = req.params;
    const { location } = req.body;

    if (!empCode) {
      return res.status(400).json({
        success: false,
        error: "Employee Code is required"
      });
    }

    if (!location) {
      return res.status(400).json({
        success: false,
        error: "Location is required"
      });
    }

    const updatedUser = await prisma.user.update({
      where: { empCode: empCode },
      data: { location: location },
      select: {
        empCode: true,
        username: true,
        email: true,
        location: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        empCode: updatedUser.empCode,
        username: updatedUser.username,
        email: updatedUser.email,
        location: updatedUser.location,
        updatedAt: updatedUser.updatedAt
      },
      message: "Location updated successfully"
    });

  } catch (error: any) {
    console.error("Update user location error:", error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};