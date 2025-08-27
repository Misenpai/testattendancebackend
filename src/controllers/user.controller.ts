import type { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma/index.js';
import bcrypt from 'bcrypt';
import { createUserFolder } from '../utils/folderUtils.js';
import { generateToken } from '../utils/jwt.js';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

export const createUser = async (req: Request, res: Response) => {
  try {
    const { empCode, username, email, password, location = "all" } = req.body;
    
    if (!empCode || !username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "Employee Code, username, email, and password are required" 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: "Password must be at least 6 characters long" 
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase().trim() },
          { empCode: empCode.trim() },
          { username: username.trim() }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: "User already exists with this email, employee code, or username" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          empCode: empCode.trim(),
          username: username.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          location: location,
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

    // Generate JWT token
    const token = generateToken({
      userKey: user!.userKey,
      empCode: user!.empCode,
      username: user!.username,
      email: user!.email
    });

    const { password: _, ...userWithoutPassword } = user!;

    res.status(201).json({
      success: true, 
      username: user!.username,
      empCode: user!.empCode,
      user: {
        ...userWithoutPassword,
        userKey: user!.userKey,
        id: user!.empCode // For backward compatibility
      },
      token,
      message: "User created successfully"
    });

  } catch (error: any) {
    console.error("Create user error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "Username and password are required" 
      });
    }

    const user = await prisma.user.findUnique({
      where: { username: username },
      include: {
        userLocation: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid username or password" 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        error: "Account is deactivated. Please contact administrator." 
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid username or password" 
      });
    }

    createUserFolder(user.username);

    // Generate JWT token
    const token = generateToken({
      userKey: user.userKey,
      empCode: user.empCode,
      username: user.username,
      email: user.email
    });

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({ 
      success: true, 
      userId: user.userKey,
      empCode: user.empCode,
      username: user.username,
      user: {
        ...userWithoutPassword,
        userKey: user.userKey,
        id: user.empCode // For backward compatibility
      },
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
    const { empCode } = req.params;

    if (!empCode) {
      return res.status(400).json({
        success: false,
        error: "Employee Code is required"
      });
    }

    const user = await prisma.user.findUnique({
      where: { empCode },
      select: {
        userKey: true,
        empCode: true,
        username: true,
        email: true,
        location: true,
        role: true,
        isActive: true,
        createdAt: true,
        userLocation: {
          select: {
            locationType: true,
            updatedAt: true,
            approxLat: true,
            approxLng: true,
            approxRadius: true
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

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { empCode } = req.params;
    const { username, email, location, isActive } = req.body;

    if (!empCode) {
      return res.status(400).json({
        success: false,
        error: "Employee Code is required"
      });
    }

    if (username || email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { empCode: { not: empCode } },
            {
              OR: [
                ...(username ? [{ username: username.trim() }] : []),
                ...(email ? [{ email: email.toLowerCase().trim() }] : [])
              ]
            }
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: "Username or email already exists"
        });
      }
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { empCode },
        data: {
          ...(username && { username: username.trim() }),
          ...(email && { email: email.toLowerCase().trim() }),
          ...(location && { location }),
          ...(typeof isActive === 'boolean' && { isActive })
        },
        include: {
          userLocation: true
        }
      });

      if (username) {
        await tx.userLocation.update({
          where: { empCode },
          data: { username: username.trim() }
        });
      }

      return user;
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: userWithoutPassword
    });

  } catch (error: any) {
    console.error("Update user error:", error);
    
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