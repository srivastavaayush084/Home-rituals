import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../utils/db';
import { sendSuccess, ConflictError, BadRequestError, UnauthorizedError, NotFoundError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendEmail, emailTemplates } from '../services/email';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtsecretkeyshouldbechangedinproduction';

function generateTokens(user: { id: string; email: string; role: 'USER' | 'ADMIN'; name: string }) {
  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export async function register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'USER',
      },
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Send registration email
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Home Rituals!',
      html: emailTemplates.getRegistrationHtml(user.name),
      text: `Hello ${user.name},\n\nWelcome to Home Rituals! Your account has been successfully created.`,
    });

    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };

    return sendSuccess(res, { user: userProfile, token: accessToken, refreshToken }, 201, 'User registered successfully');
  } catch (error) {
    next(error);
  }
}

export async function login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new BadRequestError('Invalid email or password');
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };

    return sendSuccess(res, { user: userProfile, token: accessToken, refreshToken }, 200, 'Login successful');
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Invalid or expired session. Please login again.');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update refresh token in DB (Refresh token rotation for safety)
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return sendSuccess(res, { token: accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired refresh token'));
  }
}

export async function logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null },
      });
    }
    return sendSuccess(res, null, 200, 'Logout successful');
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendSuccess(res, null, 200, 'If this email is registered, a password reset link has been sent');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour validity

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExp: expiry,
      },
    });

    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Reset your password - Home Rituals',
      html: emailTemplates.getPasswordResetHtml(resetUrl),
      text: `Please reset your password by clicking this link: ${resetUrl}`,
    });

    return sendSuccess(res, null, 200, 'If this email is registered, a password reset link has been sent');
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExp: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExp: null,
      },
    });

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password updated successfully - Home Rituals',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
          <h2 style="color: #0B8F3C;">Password Reset Success</h2>
          <p>Hello ${user.name},</p>
          <p>Your password has been reset successfully. You can now log in using your new password.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">&copy; Home Rituals. All rights reserved.</p>
        </div>
      `,
      text: `Hello ${user.name},\n\nYour password has been successfully reset.`,
    });

    return sendSuccess(res, null, 200, 'Password has been reset successfully');
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new BadRequestError('User details not loaded');
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } as any,
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { name, phone } = req.body;

    if (!name || !String(name).trim()) {
      throw new BadRequestError('Name is required');
    }

    const updateData: any = { name: String(name).trim() };
    if (phone !== undefined) {
      updateData.phone = phone ? String(phone).trim() : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true } as any,
    });

    return sendSuccess(res, updatedUser, 200, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }

    if (String(newPassword).length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError('Incorrect current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return sendSuccess(res, null, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}
