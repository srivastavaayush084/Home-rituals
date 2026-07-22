import { Router } from 'express';
import { uploadImageController } from '../controllers/uploadController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../services/cloudinary';

const router = Router();

// Protect media uploads so only authorized Admins can perform them
router.post('/', requireAuth, requireAdmin, upload.single('file'), uploadImageController);

export default router;
