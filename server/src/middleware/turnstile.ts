import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Cloudflare Turnstile CAPTCHA verification middleware.
 * Verifies turnstile response tokens with Cloudflare's siteverify API.
 * Gracefully bypasses if TURNSTILE_SECRET_KEY is not configured or left as placeholder,
 * ensuring authentications are never blocked with 500 errors when Turnstile is inactive.
 */
export async function verifyTurnstile(req: Request, res: Response, next: NextFunction) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isConfigured = Boolean(
    secretKey &&
    secretKey.trim() !== '' &&
    secretKey !== 'your_cloudflare_turnstile_secret_key'
  );

  // If Turnstile secret is not configured or in development, allow requests through smoothly
  if (!isConfigured || isDevelopment) {
    return next();
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
    formData.append('secret', secretKey!);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

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
    logger.error('[Turnstile] Cloudflare siteverify error or timeout:', error);
    // Fail-open so users are not locked out during third-party Cloudflare outages
    return next();
  }
}
