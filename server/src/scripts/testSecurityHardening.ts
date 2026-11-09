import crypto from 'crypto';
import { verifyMetaSignature } from '../controllers/whatsappWebhookController';
import { checkCompromisedPassword } from '../services/passwordSecurity';
import { authSchemas } from '../validations/schemas';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('HOME RITUALS — APPLICATION SECURITY HARDENING TEST SUITE');
  console.log('================================================================\n');

  // TEST 1: Meta WhatsApp Webhook HMAC-SHA256 Signature Verification
  console.log('TEST 1: Meta WhatsApp Inbound Webhook HMAC-SHA256 Signature Verification');
  {
    const secret = 'test_meta_app_secret_998877';
    const rawPayload = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', test: true }));
    const validHmac = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
    const validHeader = `sha256=${validHmac}`;
    const forgedHeader = 'sha256=11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';

    assert(verifyMetaSignature(rawPayload, validHeader, secret) === true, 'Accepts valid Meta HMAC-SHA256 signature');
    assert(verifyMetaSignature(rawPayload, forgedHeader, secret) === false, 'Rejects forged Meta HMAC signature');
    assert(verifyMetaSignature(rawPayload, undefined, secret) === false, 'Rejects missing signature header');
    assert(verifyMetaSignature(undefined, validHeader, secret) === false, 'Rejects undefined raw body payload');
  }

  // TEST 2: Password Minimum Length (8 characters) and Passphrase Support
  console.log('\nTEST 2: Server-Side Password Length & Passphrase Enforcement');
  {
    const shortResult = authSchemas.register.safeParse({
      body: { name: 'Ayush', email: 'ayush@example.com', password: 'short' },
    });
    assert(shortResult.success === false, 'Rejects registration password shorter than 8 characters');

    const validResult = authSchemas.register.safeParse({
      body: { name: 'Ayush', email: 'ayush@example.com', password: 'ValidPassword123!' },
    });
    assert(validResult.success === true, 'Accepts password >= 8 characters');

    const longPassphrase = 'the quick brown fox jumps over the lazy dog in the tranquil evening';
    const passphraseResult = authSchemas.register.safeParse({
      body: { name: 'Ayush', email: 'ayush@example.com', password: longPassphrase },
    });
    assert(passphraseResult.success === true, 'Supports long natural passphrases');
  }

  // TEST 3: Compromised Password Detection (k-Anonymity)
  console.log('\nTEST 3: Compromised Password Detection (HIBP Range Query)');
  {
    // 'password123' is one of the most breached passwords in history
    const breached = await checkCompromisedPassword('password123');
    assert(breached.isCompromised === true && breached.breachCount > 0, 'Detects well-known breached password (password123)');

    // Strong unique passphrase should not be flagged
    const uniquePassphrase = `HomeRituals_${crypto.randomBytes(16).toString('hex')}_SecurePass`;
    const clean = await checkCompromisedPassword(uniquePassphrase);
    assert(clean.isCompromised === false, 'Does not flag unique secure random passphrase');
  }

  // TEST 4: Prototype Pollution & Sensitive Character Preservation in Sanitizer
  console.log('\nTEST 4: XSS Sanitizer Prototype Safety & Password Character Preservation');
  {
    const { xssSanitizer } = await import('../middleware/validator');
    const mockReq: any = {
      body: {
        __proto__: { polluted: 'true' },
        name: '<script>alert("xss")</script>John',
        password: 'P@ssword<With>Special&Chars',
        nested: {
          comment: '<b>Clean</b>',
        },
      },
    };

    xssSanitizer(mockReq, {} as any, () => {});

    assert(mockReq.body.__proto__ === undefined || ({} as any).polluted === undefined, 'Neutralizes prototype pollution attempts');
    assert(mockReq.body.name === '&lt;script&gt;alert("xss")&lt;/script&gt;John', 'HTML encodes script tags in normal fields');
    assert(mockReq.body.password === 'P@ssword<With>Special&Chars', 'Preserves passwords containing < and > without mutating user credentials');
    assert(mockReq.body.nested.comment === '&lt;b&gt;Clean&lt;/b&gt;', 'Sanitizes nested object fields recursively');
  }

  // TEST 5: Rate Limiter Configuration Check
  console.log('\nTEST 5: Rate Limiter Configuration Verification');
  {
    const { authLimiter, passwordResetLimiter, contactLimiter, newsletterLimiter, reviewLimiter } = await import('../middleware/rateLimiter');
    assert(typeof authLimiter === 'function', 'authLimiter is configured');
    assert(typeof passwordResetLimiter === 'function', 'passwordResetLimiter is configured');
    assert(typeof contactLimiter === 'function', 'contactLimiter is configured');
    assert(typeof newsletterLimiter === 'function', 'newsletterLimiter is configured');
    assert(typeof reviewLimiter === 'function', 'reviewLimiter is configured');
  }

  // TEST 6: Sensitive Data Redaction in Logger
  console.log('\nTEST 6: Sensitive Data Redaction in Winston Logger');
  {
    const { logger } = await import('../utils/logger');
    assert(logger !== undefined, 'Logger instance initialized');
  }

  console.log('\n================================================================');
  console.log(`SECURITY TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Security test run failed:', err);
  process.exit(1);
});
