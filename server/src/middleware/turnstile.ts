import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Cloudflare Turnstile CAPTCHA verification middleware.
 * Verifies turnstile response tokens with Cloudflare's siteverify API.
 * Rules: Skip only when TURNSTILE_SECRET_KEY is unset AND NODE_ENV is "development".
 */
export async function verifyTurnstile(req: Request, res: Response, next: NextFunction) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Skip only when the secret is unset AND NODE_ENV is "development"
  if (!secretKey && isDevelopment) {
    return next();
  }

  if (!secretKey) {
    logger.error('[Turnstile] Server misconfiguration: TURNSTILE_SECRET_KEY is missing outside development.');
    return res.status(500).json({
      success: false,
      error: {
        message: 'Security challenge verification service is unconfigured.',
        code: 'TURNSTILE_NOT_CONFIGURED',
      },
    });
  }

  const token =
    req.body?.['cf-turnstile-response'] ||
    req.body?.turnstileToken ||
    req.headers['cf-turnstile-response'] ||
    req.headers['x-turnstile-token'];

  if (!token || typeof token !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Security challenge verification failed. Please complete the security check.',
        code: 'TURNSTILE_TOKEN_REQUIRED',
      },
    });
  }

  try {
    const remoteIp = (req.ip || req.socket?.remoteAddress || '').replace(/^.*:/, '');
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const outcome = (await response.json()) as { success: boolean; 'error-codes'?: string[] };

    if (!outcome.success) {
      logger.warn(`[Turnstile] Challenge verification failed for IP ${remoteIp}:`, outcome['error-codes']);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Security challenge failed. Please refresh and try again.',
          code: 'TURNSTILE_VERIFICATION_FAILED',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('[Turnstile] Error verifying token with Cloudflare API:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Security challenge verification temporarily unavailable. Please try again.',
        code: 'TURNSTILE_SERVICE_ERROR',
      },
    });
  }
}
