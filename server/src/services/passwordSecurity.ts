import crypto from 'crypto';
import https from 'https';
import { logger } from '../utils/logger';

export interface CompromisedPasswordCheckResult {
  isCompromised: boolean;
  breachCount: number;
}

/**
 * Checks whether a candidate password has appeared in known data breaches
 * using Have I Been Pwned's privacy-preserving k-Anonymity Range API.
 * 
 * - Privacy: Plaintext password is NEVER transmitted. Only the first 5 characters
 *   of the SHA-1 hash (prefix) are queried. The remaining 35 characters (suffix)
 *   are matched locally in memory.
 * - Resilience: Fails open on timeout/network failure so downtime of an external service
 *   does not prevent legitimate users from registering or resetting passwords.
 */
export async function checkCompromisedPassword(password: string): Promise<CompromisedPasswordCheckResult> {
  if (!password || password.length === 0) {
    return { isCompromised: false, breachCount: 0 };
  }

  // 1. Generate uppercase SHA-1 hash of the password
  const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1Hash.substring(0, 5);
  const suffix = sha1Hash.substring(5);

  return new Promise<CompromisedPasswordCheckResult>((resolve) => {
    // 2-second timeout to prevent slowing down authentication responses
    const req = https.get(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          'User-Agent': 'Home-Rituals-Security-Verification',
          'Add-Padding': 'true', // Mitigates response size side-channel
        },
        timeout: 2000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          logger.warn(`[Password Security] HIBP range check returned HTTP ${res.statusCode}. Failing open.`);
          return resolve({ isCompromised: false, breachCount: 0 });
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const lines = data.split('\r\n');
          for (const line of lines) {
            const [hashSuffix, countStr] = line.split(':');
            if (hashSuffix && hashSuffix.trim() === suffix) {
              const count = parseInt(countStr || '0', 10);
              return resolve({ isCompromised: true, breachCount: count });
            }
          }
          return resolve({ isCompromised: false, breachCount: 0 });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      logger.warn('[Password Security] HIBP range check timed out. Failing open.');
      return resolve({ isCompromised: false, breachCount: 0 });
    });

    req.on('error', (err) => {
      logger.warn('[Password Security] HIBP range check connection failed:', err.message);
      return resolve({ isCompromised: false, breachCount: 0 });
    });
  });
}
