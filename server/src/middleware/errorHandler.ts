import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError, AppError } from '../utils/response';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // If it's a known API error
  if (err instanceof AppError) {
    logger.warn(`API Error [${err.code}] ${err.status} - ${err.message}`);
    return sendError(res, err.message, err.status, err.code, err.details);
  }

  // If it's a Zod validation error
  if (err instanceof ZodError) {
    logger.warn(`Validation Error - ${JSON.stringify(err.errors)}`);
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(
      res,
      'Input validation failed',
      400,
      'VALIDATION_ERROR',
      details
    );
  }

  // Check for database connection refusal or timeout
  if (
    err.message?.includes('Server selection timeout') ||
    err.message?.includes('actively refused it') ||
    err.message?.includes('10061')
  ) {
    logger.error('Database connection failed. MongoDB is not running or unreachable.');
    return sendError(
      res,
      'Database is offline: MongoDB is not running on localhost:27017. Please start your local MongoDB service or provide a MongoDB Atlas URI in server/.env.',
      503,
      'DATABASE_OFFLINE'
    );
  }

  // Standard Prisma Database errors or other system errors
  logger.error('Unhandled Server Error:', err);

  const isProduction = process.env.NODE_ENV === 'production';
  return sendError(
    res,
    isProduction ? 'An unexpected server error occurred' : err.message,
    500,
    'INTERNAL_SERVER_ERROR',
    isProduction ? undefined : err.stack
  );
}
