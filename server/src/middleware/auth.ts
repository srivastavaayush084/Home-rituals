import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db';
import { UnauthorizedError, ForbiddenError } from '../utils/response';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'USER' | 'ADMIN';
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtsecretkeyshouldbechangedinproduction';

/**
 * Middleware to extract and verify JWT token from Authorization header
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    
    // Validate that the user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (user) {
      req.user = user as UserPayload;
    }
  } catch (error) {
    // JWT verification fail, we simply don't set req.user
  }
  next();
}

/**
 * Middleware that strictly requires user authentication
 */
export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new UnauthorizedError('You must be logged in to access this resource'));
  }
  next();
}

/**
 * Middleware that requires a specific role
 */
export function requireRole(role: 'USER' | 'ADMIN') {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('You must be logged in to access this resource'));
    }

    if (req.user.role !== role) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
}

/**
 * Shorthand for admin check
 */
export const requireAdmin = requireRole('ADMIN');
