import { storeImageFile } from '../services/storageService';
import { BadRequestError } from '../utils/response';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ReturnService } from '../services/returnService';
import { sendSuccess } from '../utils/response';

/**
 * Customer: Submit return request
 */
export async function createReturn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { orderId, items, reason, description, images, codUpiId, codAccountDetails } = req.body;

    const returnRequest = await ReturnService.createReturnRequest(userId, {
      orderId,
      items,
      reason,
      description,
      images,
      codUpiId,
      codAccountDetails,
    });

    return sendSuccess(
      res,
      returnRequest,
      201,
      'Return request submitted successfully. Our support team will review it within 24 hours.'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Customer: Get own return requests
 */
export async function getMyReturns(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const returns = await ReturnService.getUserReturns(userId);
    return sendSuccess(res, returns, 200, 'User returns retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Customer or Admin: Get return request by ID
 */
export async function getReturnById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    const { id } = req.params;

    const returnRequest = await ReturnService.getReturnById(id, userId, isAdmin);
    return sendSuccess(res, returnRequest, 200, 'Return request details retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: List all returns with optional filtering and pagination
 */
export async function getAllReturns(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await ReturnService.getAllReturns({ status, page, limit });
    return sendSuccess(res, result, 200, 'Returns list retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Approve or Reject return request
 */
export async function reviewReturn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.id;
    const { id } = req.params;
    const { action, rejectionReason, notes } = req.body;

    const updated = await ReturnService.reviewReturn(adminId, id, {
      action,
      rejectionReason,
      notes,
    });

    return sendSuccess(
      res,
      updated,
      200,
      `Return request has been ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Schedule reverse pickup
 */
export async function scheduleReversePickup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.id;
    const { id } = req.params;
    const { courier, awb, scheduledAt } = req.body;

    const updated = await ReturnService.scheduleReversePickup(adminId, id, {
      courier,
      awb,
      scheduledAt,
    });

    return sendSuccess(res, updated, 200, 'Reverse pickup scheduled successfully with AWB tracking number');
  } catch (error) {
    next(error);
  }
}

/**
 * Admin / Courier Webhook: Update pickup status (PICKED_UP)
 */
export async function updatePickupStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = await ReturnService.updatePickupStatus(id, status, notes);
    return sendSuccess(res, updated, 200, `Pickup status updated to ${status}`);
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Record package arrival at warehouse
 */
export async function receiveReturn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.id;
    const { id } = req.params;
    const { notes } = req.body;

    const updated = await ReturnService.recordWarehouseReceipt(adminId, id, notes);
    return sendSuccess(res, updated, 200, 'Return package marked as received at warehouse');
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Perform quality inspection (PASSED or FAILED)
 */
export async function inspectReturn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.id;
    const { id } = req.params;
    const { result, notes, restoreStock } = req.body;

    const updated = await ReturnService.performQualityInspection(adminId, id, {
      result,
      notes,
      restoreStock,
    });

    const msg =
      result === 'PASSED'
        ? 'Inspection passed! Stock restored and refund initiated.'
        : 'Inspection recorded as failed.';

    return sendSuccess(res, updated, 200, msg);
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Record COD manual payout (UPI / NEFT)
 */
export async function recordCodPayout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.id;
    const { id } = req.params;
    const { amount, payoutReference, notes } = req.body;

    const updated = await ReturnService.recordCodPayout(adminId, id, {
      amount,
      payoutReference,
      notes,
    });

    return sendSuccess(res, updated, 200, `COD refund of ₹${amount} recorded successfully. UTR: ${payoutReference}`);
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Retry failed gateway refund
 */
export async function retryReturnRefund(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.id;
    const { id } = req.params;
    const notes = req.body?.notes;

    const updated = await ReturnService.retryReturnRefund(adminId, id, notes);
    return sendSuccess(res, updated, 200, 'Refund retry initiated successfully through Razorpay');
  } catch (error) {
    next(error);
  }
}

/**
 * Customer / Admin: Upload damage / return proof photo to persistent storage
 */
export async function uploadReturnEvidence(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      throw new BadRequestError('No image file was provided for upload.');
    }

    const stored = await storeImageFile(file.buffer, file.originalname, 'returns');

    return sendSuccess(
      res,
      {
        url: stored.url,
        storageType: stored.storageType,
        filename: stored.filename,
      },
      200,
      'Proof photo uploaded to persistent storage successfully'
    );
  } catch (error) {
    next(error);
  }
}
