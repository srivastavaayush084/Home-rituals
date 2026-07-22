import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function sendSuccess<T>(res: Response, data: T, status = 200, message?: string) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  status = 200,
  message?: string
) {
  return res.status(status).json({
    success: true,
    message,
    pagination,
    data,
  });
}

export function sendError(
  res: Response,
  message: string,
  status = 500,
  code = 'INTERNAL_SERVER_ERROR',
  details?: any
) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      code,
      details,
    },
  });
}
export class AppError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(message: string, status = 500, code = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access', details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict state', details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}
