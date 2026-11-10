import multer from 'multer';

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});
import { Router } from 'express';
import {
  createReturn,
  getMyReturns,
  getReturnById,
  getAllReturns,
  reviewReturn,
  scheduleReversePickup,
  updatePickupStatus,
  receiveReturn,
  inspectReturn,
  recordCodPayout,
  retryReturnRefund,
  uploadReturnEvidence,
} from '../controllers/returnController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { returnSchemas } from '../validations/schemas';

const router = Router();

// All return routes require authentication
router.use(requireAuth);

// Customer endpoints

// Photo upload for return proof (persistent storage)
router.post('/upload-image', imageUpload.single('image'), uploadReturnEvidence);

router.post('/', validateRequest(returnSchemas.create), createReturn);
router.get('/my-returns', getMyReturns);
router.get('/admin/all', requireAdmin, getAllReturns);
router.get('/:id', getReturnById);

// Admin workflow endpoints
router.post('/admin/:id/review', requireAdmin, validateRequest(returnSchemas.review), reviewReturn);
router.post('/admin/:id/pickup', requireAdmin, validateRequest(returnSchemas.reversePickup), scheduleReversePickup);
router.post('/admin/:id/pickup-status', requireAdmin, validateRequest(returnSchemas.updatePickupStatus), updatePickupStatus);
router.post('/admin/:id/receive', requireAdmin, validateRequest(returnSchemas.receive), receiveReturn);
router.post('/admin/:id/inspect', requireAdmin, validateRequest(returnSchemas.inspect), inspectReturn);
router.post('/admin/:id/cod-payout', requireAdmin, validateRequest(returnSchemas.codPayout), recordCodPayout);
router.post('/admin/:id/retry-refund', requireAdmin, retryReturnRefund);

export default router;

