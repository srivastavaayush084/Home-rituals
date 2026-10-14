import { logger } from './logger';

/**
 * Returns the JWT secret from environment variables.
 * In production, strictly throws a fatal error if JWT_SECRET is unset or using a default insecure key.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  const isInsecure =
    !secret ||
    secret === 'supersecretjwtsecretkeyshouldbechangedinproduction' ||
    secret.includes('shouldbechanged') ||
    secret.length < 32;

  if (isProduction && isInsecure) {
    logger.error('CRITICAL SECURITY ERROR: JWT_SECRET must be configured with a strong, private key (>= 32 chars) in production.');
    throw new Error('FATAL: Insecure or missing JWT_SECRET in production environment.');
  }

  if (isInsecure && !isProduction) {
    logger.warn('SECURITY WARNING: Using development fallback JWT secret. Set a strong JWT_SECRET in .env for production.');
    return secret || 'development_jwt_secret_strictly_for_local_debugging_32_chars';
  }

  return secret!;
}
