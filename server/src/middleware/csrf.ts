import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/response';

const EXEMPT_WEBHOOK_PATHS = [
  '/api/payment/webhook',
  '/api/orders/webhook/nimbuspost',
  '/api/whatsapp/webhook',
];

/**
 * Validates state-changing requests against Cross-Site Request Forgery (CSRF).
 * Webhooks with cryptographic signatures are strictly exempted.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  // Safe HTTP methods do not change state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt server-to-server webhook endpoints verified by cryptographic signatures
  const path = req.path || req.originalUrl;
  if (EXEMPT_WEBHOOK_PATHS.some((exempt) => path.startsWith(exempt))) {
    return next();
  }

  // Validate custom request header or origin
  const origin = req.headers.origin || req.headers.referer;
  const hasCustomHeader = Boolean(
    req.headers['x-requested-with'] ||
    req.headers['authorization'] ||
    req.headers['x-csrf-protection']
  );

  // In production, verify Origin matches trusted domains if present
  if (origin && process.env.NODE_ENV === 'production') {
    const originUrl = new URL(origin);
    const hostname = originUrl.hostname.toLowerCase();
    const isAllowedHost =
      hostname === 'homerituals.co' ||
      hostname.endsWith('.homerituals.co') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1';

    if (!isAllowedHost) {
      return next(new ForbiddenError('CSRF verification failed: Untrusted origin.'));
    }
  }

  // If request relies solely on ambient cookies without Bearer token, ensure custom header or valid origin
  if (!hasCustomHeader && !origin && process.env.NODE_ENV === 'production') {
    return next(new ForbiddenError('CSRF verification failed: Missing request signature.'));
  }

  next();
}

