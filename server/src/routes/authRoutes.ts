import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, getMe, refresh, logout, updateProfile, changePassword } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { authSchemas } from '../validations/schemas';
import { authLimiter, passwordResetLimiter, refreshLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, validateRequest(authSchemas.register), register);
router.post('/login', authLimiter, validateRequest(authSchemas.login), login);
router.post('/forgot-password', passwordResetLimiter, validateRequest(authSchemas.forgotPassword), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateRequest(authSchemas.resetPassword), resetPassword);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);
router.put('/change-password', requireAuth, validateRequest(authSchemas.changePassword), changePassword);

export default router;
