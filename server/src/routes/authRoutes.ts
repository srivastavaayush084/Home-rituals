import { Router } from 'express';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getMe,
  refresh,
  logout,
  updateProfile,
  changePassword,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { authSchemas } from '../validations/schemas';
import { authLimiter, passwordResetLimiter, refreshLimiter, resendVerificationLimiter } from '../middleware/rateLimiter';
import { verifyTurnstile } from '../middleware/turnstile';

const router = Router();

router.post('/register', authLimiter, verifyTurnstile, validateRequest(authSchemas.register), register);
router.post('/login', authLimiter, verifyTurnstile, validateRequest(authSchemas.login), login);
router.post('/forgot-password', passwordResetLimiter, verifyTurnstile, validateRequest(authSchemas.forgotPassword), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateRequest(authSchemas.resetPassword), resetPassword);
router.post('/verify-email', validateRequest(authSchemas.verifyEmail), verifyEmail);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, validateRequest(authSchemas.resendVerification), resendVerificationEmail);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);
router.put('/change-password', requireAuth, validateRequest(authSchemas.changePassword), changePassword);

export default router;
