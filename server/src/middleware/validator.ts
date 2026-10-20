import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export function validateRequest(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Assign back sanitized/validated inputs
      req.body = parsed.body || req.body;
      req.query = parsed.query || req.query;
      req.params = parsed.params || req.params;
      
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Basic XSS sanitizer middleware for input strings
 */
export function xssSanitizer(req: Request, _res: Response, next: NextFunction) {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  next();
}

const SENSITIVE_RAW_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'refreshToken',
  'razorpaySignature',
  'signature',
]);

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeObject(obj: any) {
  if (!obj || typeof obj !== 'object') return;

  for (const key of Object.keys(obj)) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
      delete obj[key];
      continue;
    }

    if (SENSITIVE_RAW_KEYS.has(key)) {
      continue;
    }

    if (typeof obj[key] === 'string') {
      // Basic HTML escape to prevent script tags and HTML injection attacks
      obj[key] = obj[key]
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
