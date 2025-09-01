import type { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

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
        employeeNumber: true,
        username: true,
        empClass: true,
        dateOfResign: true
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
    console.error("Get user profile by username error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { employeeNumber } = req.params;
    const { username, empClass, dateOfResign } = req.body;

    if (!employeeNumber) {
      return res.status(400).json({
        success: false,
        error: "Employee Number is required"
      });
    }

    const updateUserData: any = {};
    if (username) updateUserData.username = username.trim();
    if (empClass) updateUserData.empClass = empClass;
    if (dateOfResign) updateUserData.dateOfResign = new Date(dateOfResign);

    if (Object.keys(updateUserData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one field is required for update"
      });
    }

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { username: username.trim() },
            { NOT: { employeeNumber: employeeNumber } }
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: "Username is already taken by another user"
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { employeeNumber: employeeNumber },
      data: updateUserData,
      select: {
        employeeNumber: true,
        username: true,
        empClass: true,
        dateOfResign: true
      }
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
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