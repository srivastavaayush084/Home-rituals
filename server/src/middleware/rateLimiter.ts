import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for sensitive authentication endpoints (login, register).
 * Limits to 15 requests per 15 minutes per IP to mitigate credential stuffing and brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for password reset requests to prevent email bombing and token enumeration.
 * Limits to 5 requests per 1 hour per IP.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Too many password reset requests from this IP address. Please try again in an hour.',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
