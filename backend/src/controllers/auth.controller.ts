// backend/src/controllers/auth.controller.ts

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  employeeId: z.string().min(1),
  department: z.string().min(1),
  role: z.enum(['FACULTY', 'HOD', 'ADMIN']).optional(),
  phoneNumber: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Generate JWT token
const generateToken = (userId: string, email: string, role: string): string => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

export const register = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check for existing user with same email or employee ID
    const existingUser = await User.findOne({
      $or: [
        { email: validatedData.email },
        { employeeId: validatedData.employeeId }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email or employee ID already exists'
      });
    }

    // Additional validation: Check if department already has a HOD
    if (validatedData.role === 'HOD') {
      const existingHOD = await User.findOne({
        department: validatedData.department,
        role: 'HOD',
        isActive: true
      });

      if (existingHOD) {
        return res.status(400).json({
          message: `Department '${validatedData.department}' already has a HOD (${existingHOD.firstName} ${existingHOD.lastName}). Each department can have only one HOD.`
        });
      }
    }

    const user = await User.create(validatedData);

    const userObject = user.toObject();
    const { password, ...userWithoutPassword } = userObject;

    const token = generateToken(
      user._id.toString(),
      user.email,
      user.role
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
    }

    console.error('Registration error:', error);
    return res.status(500).json({
      message: 'Server error during registration'
    });
  }
};

export const login = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const isPasswordValid = await user.comparePassword(
      validatedData.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(
      user._id.toString(),
      user.email,
      user.role
    );

    const userObject = user.toObject();
    const { password, ...userWithoutPassword } = userObject;

    return res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
    }

    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Server error during login'
    });
  }
};

export const getProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const changePassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
