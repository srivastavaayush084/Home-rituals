import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      cookies?: Record<string, string>;
    }
  }
}

/**
 * Lightweight native cookie parser middleware.
 * Parses standard HTTP Cookie headers without additional external dependencies.
 */
export function cookieParser(req: Request, _res: Response, next: NextFunction) {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const key = parts[0]?.trim();
      const value = parts.slice(1).join('=').trim();
      if (key) {
        try {
          req.cookies![key] = decodeURIComponent(value);
        } catch {
          req.cookies![key] = value;
        }
      }
    });
  }
  next();
}

export const REFRESH_COOKIE_NAME = 'home_rituals_refresh';

/**
 * Returns hardened cookie configuration options tailored for current environment.
 */
export function getRefreshCookieOptions() {
  const isSecure = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' || process.env.FRONTEND_URL?.startsWith('https');
  return {
    httpOnly: true,
    secure: Boolean(isSecure),
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
}

/**
 * Sets the HttpOnly refresh token cookie on the response.
 */
export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
}

/**
 * Clears the HttpOnly refresh token cookie with matching path and flags.
 */
export function clearRefreshTokenCookie(res: Response) {
  const isSecure = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' || process.env.FRONTEND_URL?.startsWith('https');
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: Boolean(isSecure),
    sameSite: 'lax' as const,
    path: '/api/auth',
  });
}

