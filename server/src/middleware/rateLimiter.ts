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

/**
 * Strict rate limiter for contact message submissions to mitigate spam and inbox flooding.
 * Limits to 5 submissions per 15 minutes per IP.
 */
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Too many messages sent from this IP address. Please wait a few minutes before submitting again.',
      code: 'CONTACT_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for newsletter signups to prevent automated email list poisoning.
 * Limits to 5 subscriptions per 15 minutes per IP.
 */
export const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Too many subscription attempts from this IP address. Please try again later.',
      code: 'NEWSLETTER_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for customer review submissions.
 * Limits to 10 review submissions per 15 minutes per IP.
 */
export const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: {
      message: 'Too many reviews submitted from this IP address. Please wait a while before submitting another review.',
      code: 'REVIEW_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for token refresh requests.
 * Limits to 30 requests per 15 minutes per IP.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    success: false,
    error: {
      message: 'Too many session refresh attempts from this IP address. Please try again after 15 minutes.',
      code: 'REFRESH_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for resending email verification requests.
 * Limits to 5 requests per 15 minutes per IP to mitigate spam and email flooding.
 */
export const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Too many verification email requests from this IP address. Please try again in 15 minutes.',
      code: 'RESEND_VERIFICATION_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
