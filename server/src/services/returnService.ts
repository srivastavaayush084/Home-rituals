import { prisma } from '../utils/db';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/response';
import { RazorpayRefundService } from './razorpayRefundService';
import { sendEmail, emailTemplates } from './email';

export const RETURN_REASONS = [
  'Damaged / Defective',
  'Wrong Item Delivered',
  'Quality Not as Expected',
  'Missing Parts or Accessories',
  'Item Different from Description',
  'Other',
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

export interface CreateReturnItemInput {
  orderItemId: string;
  quantity: number;
}

export interface CreateReturnInput {
  orderId: string;
  items: CreateReturnItemInput[];
  reason: string;
  description: string;
  images?: string[];
  codUpiId?: string | null;
  codAccountDetails?: Record<string, any> | null;
}

export interface ReviewReturnInput {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string | null;
  notes?: string | null;
}

export interface ReversePickupInput {
  courier: string;
  awb: string;
  scheduledAt?: string | null;
}

export interface InspectReturnInput {
  result: 'PASSED' | 'FAILED';
  notes: string;
  restoreStock?: boolean;
}

export interface CodPayoutInput {
  amount: number;
  payoutReference: string;
  notes?: string | null;
}

/**
 * Validates whether an order is eligible for customer return.
 * Rules:
 * 1. Order status must be 'Delivered'.
 * 2. Delivery must have occurred within the 48-hour return window.
 * 3. No active or completed return request exists.
 */
export function checkReturnEligibility(order: {
  id: string;
  status: string;
  deliveredAt?: Date | null;
  updatedAt: Date;
  returns?: any[];
}): { eligible: boolean; reason?: string; deliveredTime?: Date } {
  const normalizedStatus = (order.status || '').toLowerCase().trim();

  if (normalizedStatus !== 'delivered') {
    return {
      eligible: false,
      reason: `Orders in "${order.status}" status cannot be returned. Only delivered orders are eligible for return within 48 hours.`,
    };
  }

  // Delivery time determination
  const deliveryTime = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt);
  const now = new Date();
  const elapsedMs = now.getTime() - deliveryTime.getTime();
  const returnWindowMs = 48 * 60 * 60 * 1000; // 48 hours

  if (elapsedMs > returnWindowMs) {
    const elapsedHours = Math.round(elapsedMs / (60 * 60 * 1000));
    return {
      eligible: false,
      reason: `The 48-hour return window has expired (${elapsedHours} hours since delivery). Home Rituals accepts return requests only within 48 hours of delivery.`,
      deliveredTime: deliveryTime,
    };
  }

  // Check existing return requests
  if (order.returns && order.returns.length > 0) {
    const activeReturn = order.returns.find(
      (r) => !['REJECTED', 'INSPECTION_FAILED'].includes(r.status)
    );
    if (activeReturn) {
      return {
        eligible: false,
        reason: `A return request (#${activeReturn.id}) is already in progress or completed for this order. Status: ${activeReturn.status}.`,
        deliveredTime: deliveryTime,
      };
    }
  }

  return { eligible: true, deliveredTime: deliveryTime };
}

export class ReturnService {
  /**
   * Submit a customer return request with 48h check, item validation, and photo upload support.
   */
  public static async createReturnRequest(userId: string, input: CreateReturnInput) {
    const { orderId, items, reason, description, images = [], codUpiId, codAccountDetails } = input;

    // Fetch order with items and existing returns
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        returnRequests: true,
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenError('You are not authorized to request a return for this order');
    }

    // Check return eligibility (delivered status and 48-hour policy)
    const eligibility = checkReturnEligibility({
      id: order.id,
      status: order.status,
      deliveredAt: order.deliveredAt,
      updatedAt: order.updatedAt,
      returns: order.returnRequests,
    });

    if (!eligibility.eligible) {
      throw new BadRequestError(eligibility.reason || 'Order is not eligible for return');
    }

    // Validate selected items against order items
    let calculatedRefund = 0;
    const validatedItemsSnapshot: any[] = [];

    for (const returnItem of items) {
      const orderItem = order.items.find((item) => item.id === returnItem.orderItemId);
      if (!orderItem) {
        throw new BadRequestError(`Item ${returnItem.orderItemId} was not found in Order #${order.id}`);
      }

      if (returnItem.quantity < 1 || returnItem.quantity > orderItem.quantity) {
        throw new BadRequestError(
          `Invalid return quantity ${returnItem.quantity} for product "${orderItem.product.name}". Max ordered quantity is ${orderItem.quantity}.`
        );
      }

      const itemTotal = orderItem.price * returnItem.quantity;
      calculatedRefund += itemTotal;

      validatedItemsSnapshot.push({
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        name: orderItem.product.name,
        price: orderItem.price,
        quantity: returnItem.quantity,
        sku: orderItem.product.sku,
        image: orderItem.product.image,
      });
    }

    // Ensure calculated refund does not exceed total order amount
    const finalRefundAmount = Math.min(order.totalAmount, Math.round(calculatedRefund * 100) / 100);

    // Determine refund mechanism
    const isCod = (order.paymentGateway || '').toUpperCase() === 'COD';
    const refundType = isCod ? 'COD_MANUAL' : 'GATEWAY';

    if (isCod && !codUpiId && (!codAccountDetails || Object.keys(codAccountDetails).length === 0)) {
      throw new BadRequestError('For Cash on Delivery (COD) orders, please provide a valid UPI ID or bank account details for refund transfer.');
    }

    // Create the ReturnRequest
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        items: validatedItemsSnapshot,
        reason,
        description,
        images,
        status: 'REQUESTED',
        refundType,
        refundAmount: finalRefundAmount,
        codUpiId: codUpiId || null,
        codAccountDetails: codAccountDetails || null,
      },
      include: {
        order: true,
      },
    });

    logger.info(`[Return Request Created] Return #${returnRequest.id} for Order #${order.id} by user ${userId}`);

    // Send customer confirmation email
    const customerEmail = order.user?.email;
    const customerName = order.fullName || order.user?.name || 'Valued Customer';

    if (customerEmail) {
      try {
        await sendEmail({
          to: customerEmail,
          subject: `Return Request Received - Order #${order.id} - Home Rituals`,
          text: `Hello ${customerName},\n\nWe have received your return request for Order #${order.id}.\nReturn ID: ${returnRequest.id}\nReason: ${reason}\n\nOur team will review your request within 24 hours.`,
          html: emailTemplates.getReturnRequestedHtml({
            orderId: order.id,
            customerName,
            reason,
            itemsCount: validatedItemsSnapshot.length,
            returnId: returnRequest.id,
          }),
        });
      } catch (emailErr) {
        logger.error(`[Email Error] Failed to send return request confirmation for Order #${order.id}:`, emailErr);
      }
    }

    return returnRequest;
  }

  /**
   * Get all return requests for a customer
   */
  public static async getUserReturns(userId: string) {
    return prisma.returnRequest.findMany({
      where: { userId },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            deliveredAt: true,
            paymentGateway: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get return request details by ID
   */
  public static async getReturnById(returnId: string, userId?: string, isAdmin = false) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundError('Return request not found');
    }

    if (!isAdmin && userId && returnRequest.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this return request');
    }

    return returnRequest;
  }

  /**
   * Admin: List all return requests with filters and pagination
   */
  public static async getAllReturns(params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              totalAmount: true,
              status: true,
              paymentGateway: true,
              transactionId: true,
              deliveredAt: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.returnRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Approve or Reject a return request
   */
  public static async reviewReturn(adminId: string, returnId: string, input: ReviewReturnInput) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundError('Return request not found');
    }

    if (returnRequest.status !== 'REQUESTED') {
      throw new BadRequestError(`Cannot review return in "${returnRequest.status}" status. Only "REQUESTED" returns can be reviewed.`);
    }

    const newStatus = input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: newStatus,
        rejectionReason: input.action === 'REJECT' ? input.rejectionReason : null,
        adminNotes: input.notes || null,
      },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    logger.info(`[Return Reviewed] Return #${returnId} marked as ${newStatus} by Admin ${adminId}`);

    // Send email notification to customer
    const customerEmail = updated.order.user?.email;
    const customerName = updated.order.fullName || updated.order.user?.name || 'Customer';

    if (customerEmail) {
      try {
        await sendEmail({
          to: customerEmail,
          subject: `Return Request ${input.action === 'APPROVE' ? 'Approved' : 'Declined'} - Order #${updated.orderId} - Home Rituals`,
          text: `Hello ${customerName},\n\nYour return request #${returnId} for Order #${updated.orderId} has been ${input.action.toLowerCase()}.\n${input.rejectionReason ? `Reason: ${input.rejectionReason}\n` : ''}`,
          html: emailTemplates.getReturnReviewedHtml({
            orderId: updated.orderId,
            customerName,
            action: input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            rejectionReason: input.rejectionReason,
            returnId: updated.id,
          }),
        });
      } catch (emailErr) {
        logger.error(`[Email Error] Failed to send return review notification for Return #${returnId}:`, emailErr);
      }
    }

    return updated;
  }

  /**
   * Admin: Schedule reverse pickup and assign courier & AWB tracking number
   */
  public static async scheduleReversePickup(adminId: string, returnId: string, input: ReversePickupInput) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundError('Return request not found');
    }

    if (returnRequest.status !== 'APPROVED') {
      throw new BadRequestError(`Reverse pickup can only be scheduled for APPROVED return requests. Current status: ${returnRequest.status}`);
    }

    const scheduledDate = input.scheduledAt ? new Date(input.scheduledAt) : new Date();

    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'PICKUP_SCHEDULED',
        reverseCourier: input.courier,
        reversePickupAwb: input.awb,
        pickupScheduledAt: scheduledDate,
      },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    logger.info(`[Reverse Pickup Scheduled by Admin ${adminId}] Return #${returnId}, Courier: ${input.courier}, AWB: ${input.awb}`);

    // Send customer notification
    const customerEmail = updated.order.user?.email;
    const customerName = updated.order.fullName || updated.order.user?.name || 'Customer';

    if (customerEmail) {
      try {
        await sendEmail({
          to: customerEmail,
          subject: `Reverse Pickup Scheduled - Order #${updated.orderId} - Home Rituals`,
          text: `Hello ${customerName},\n\nA reverse pickup has been scheduled for your return items on Order #${updated.orderId}.\nCourier: ${input.courier}\nAWB Tracking: ${input.awb}`,
          html: emailTemplates.getReversePickupScheduledHtml({
            orderId: updated.orderId,
            customerName,
            courier: input.courier,
            awb: input.awb,
            scheduledAt: scheduledDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            returnId: updated.id,
          }),
        });
      } catch (emailErr) {
        logger.error(`[Email Error] Failed to send pickup scheduled email:`, emailErr);
      }
    }

    return updated;
  }

  /**
   * Admin / Courier Webhook: Update reverse shipment progress (e.g. PICKED_UP)
   */
  public static async updatePickupStatus(returnId: string, status: 'PICKUP_SCHEDULED' | 'PICKED_UP', notes?: string) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
    });

    if (!returnRequest) {
      throw new NotFoundError('Return request not found');
    }

    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status,
        pickedUpAt: status === 'PICKED_UP' ? new Date() : undefined,
        adminNotes: notes ? `${returnRequest.adminNotes || ''}\n${notes}`.trim() : returnRequest.adminNotes,
      },
    });

    logger.info(`[Return Status Updated] Return #${returnId} status updated to ${status}`);
    return updated;
  }

  /**
   * Admin: Record warehouse receipt when returned package arrives
   */
  public static async recordWarehouseReceipt(adminId: string, returnId: string, notes?: string) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
    });

    if (!returnRequest) {
      throw new NotFoundError('Return request not found');
    }

    if (!['PICKUP_SCHEDULED', 'PICKED_UP'].includes(returnRequest.status)) {
      throw new BadRequestError(`Cannot record warehouse receipt for return in "${returnRequest.status}" status.`);
    }

    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'RECEIVED_AT_WAREHOUSE',
        receivedAtWarehouseAt: new Date(),
        adminNotes: notes ? `${returnRequest.adminNotes || ''}\nWarehouse receipt note: ${notes}`.trim() : returnRequest.adminNotes,
      },
    });

    logger.info(`[Return Package Received] Return #${returnId} arrived at warehouse. Admin: ${adminId}`);
    return updated;
  }

  /**
   * Admin: Record quality inspection result (PASSED or FAILED).
   * If PASSED:
   *  - Idempotently restores product inventory
   *  - If prepaid (Razorpay): automatically triggers Razorpay refund
   *  - If COD: marks as ready for COD manual payout
   * If FAILED:
   *  - Records rejection notes and notifies customer
   */
  public static async performQualityInspection(adminId: string, returnId: string, input: InspectReturnInput) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundError('Return request not found');
    }

    if (returnRequest.status !== 'RECEIVED_AT_WAREHOUSE') {
      throw new BadRequestError(
        `Quality inspection can only be performed after package is RECEIVED_AT_WAREHOUSE. Current status: ${returnRequest.status}`
      );
    }

    const { result, notes, restoreStock = true } = input;
    const now = new Date();

    // 1. ATOMIC COMPARE-AND-SWAP (CAS) TRANSITION:
    // Guarantees strictly ONE concurrent thread can transition from RECEIVED_AT_WAREHOUSE
    const targetStatus = result === 'PASSED' ? 'INSPECTION_PASSED' : 'INSPECTION_FAILED';
    const casUpdate = await prisma.returnRequest.updateMany({
      where: {
        id: returnId,
        status: 'RECEIVED_AT_WAREHOUSE',
      },
      data: {
        status: targetStatus,
        inspectionResult: result,
        inspectionNotes: notes,
        inspectedAt: now,
        adminNotes: `Inspected by Admin ${adminId}. Result: ${result}. Notes: ${notes}`,
      },
    });

    if (casUpdate.count === 0) {
      const current = await prisma.returnRequest.findUnique({ where: { id: returnId } });
      if (!current) {
        throw new NotFoundError('Return request not found');
      }
      throw new BadRequestError(
        `Concurrency conflict: Return #${returnId} is already in status "${current.status}" and cannot be inspected again.`
      );
    }

    if (result === 'FAILED') {
      logger.info(`[Return Inspection FAILED] Return #${returnId} failed inspection: ${notes}`);

      const updated = await prisma.returnRequest.findUniqueOrThrow({
        where: { id: returnId },
        include: { order: { include: { user: true } } },
      });

      // Send customer notification
      const customerEmail = updated.order.user?.email;
      const customerName = updated.order.fullName || updated.order.user?.name || 'Customer';

      if (customerEmail) {
        try {
          await sendEmail({
            to: customerEmail,
            subject: `Return Inspection Notice - Order #${updated.orderId} - Home Rituals`,
            text: `Hello ${customerName},\n\nYour return items for Order #${updated.orderId} did not pass our warehouse inspection.\nRemarks: ${notes}`,
            html: emailTemplates.getReturnInspectionCompletedHtml({
              orderId: updated.orderId,
              customerName,
              result: 'FAILED',
              notes,
              returnId: updated.id,
            }),
          });
        } catch (emailErr) {
          logger.error(`[Email Error] Failed to send inspection failed email:`, emailErr);
        }
      }

      return updated;
    }

    // Inspection PASSED: Only the winning atomic CAS thread restores inventory
    logger.info(`[Return Inspection PASSED by Admin ${adminId}] Return #${returnId} passed inspection. Notes: ${notes}`);

    // Idempotently restore stock for returned items
    const returnedItems = Array.isArray(returnRequest.items) ? (returnRequest.items as any[]) : [];
    if (restoreStock && !returnRequest.stockRestored && returnedItems.length > 0) {
      for (const item of returnedItems) {
        if (item.productId && item.quantity > 0) {
          try {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: item.quantity },
                stockStatus: 'In Stock',
              },
            });
            logger.info(`[Stock Restored] Product ${item.productId} stock restored by +${item.quantity}`);
          } catch (stockErr) {
            logger.error(`[Stock Restore Error] Failed to restore stock for product ${item.productId}:`, stockErr);
          }
        }
      }

      await prisma.returnRequest.update({
        where: { id: returnId },
        data: { stockRestored: true },
      });
    }

    const order = returnRequest.order;
    const refundAmount = returnRequest.refundAmount || order.totalAmount;
    const isCod = returnRequest.refundType === 'COD_MANUAL' || (order.paymentGateway || '').toUpperCase() === 'COD';

    if (isCod) {
      // COD return: Mark as INSPECTION_PASSED, ready for admin manual payout recording
      const updated = await prisma.returnRequest.update({
        where: { id: returnId },
        data: {
          status: 'INSPECTION_PASSED',
          inspectionResult: 'PASSED',
          inspectionNotes: notes,
          inspectedAt: now,
        },
        include: {
          order: {
            include: {
              user: true,
            },
          },
        },
      });

      // Notify customer inspection passed and refund will be transferred via UPI/NEFT
      const customerEmail = updated.order.user?.email;
      const customerName = updated.order.fullName || updated.order.user?.name || 'Customer';

      if (customerEmail) {
        try {
          await sendEmail({
            to: customerEmail,
            subject: `Return Inspection Passed - Order #${updated.orderId} - Home Rituals`,
            text: `Hello ${customerName},\n\nYour return items for Order #${updated.orderId} have passed inspection! We will transfer ₹${refundAmount.toFixed(2)} to your provided account.`,
            html: emailTemplates.getReturnInspectionCompletedHtml({
              orderId: updated.orderId,
              customerName,
              result: 'PASSED',
              notes,
              refundAmount,
              refundType: 'COD_MANUAL',
              returnId: updated.id,
            }),
          });
        } catch (emailErr) {
          logger.error(`[Email Error] Failed to send inspection passed email:`, emailErr);
        }
      }

      return updated;
    }

    // Prepaid order: Initiate automated Razorpay refund
    let gatewayRefundResult: any = null;
    let refundStatus = 'PROCESSING';
    let gatewayRefundId: string | null = null;

    try {
      if (!order.transactionId) {
        throw new Error(`Order #${order.id} has no captured transaction/payment ID for Razorpay refund.`);
      }

      gatewayRefundResult = await RazorpayRefundService.createRefund({
        paymentId: order.transactionId,
        amountInRupees: refundAmount,
        orderId: order.id,
        reason: `Customer Return #${returnId} Approved & Passed Inspection`,
        notes: {
          returnId: String(returnId),
          type: 'RETURN_REFUND',
        },
      });

      gatewayRefundId = gatewayRefundResult.refundId;
      refundStatus = gatewayRefundResult.status;
    } catch (refundError: any) {
      logger.error(`[Gateway Refund Failed on Return Inspection] Return #${returnId}:`, refundError);
      // Even if gateway refund failed, mark inspection passed but record failure so admin can retry
      const updated = await prisma.returnRequest.update({
        where: { id: returnId },
        data: {
          status: 'INSPECTION_PASSED',
          inspectionResult: 'PASSED',
          inspectionNotes: `${notes}\n[Gateway Error]: ${refundError.message}`,
          inspectedAt: now,
        },
        include: {
          order: {
            include: {
              user: true,
            },
          },
        },
      });

      return updated;
    }

    // Create Refund record in DB
    const refundRecord = await prisma.refund.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        paymentGateway: 'Razorpay',
        razorpayPaymentId: order.transactionId || 'UNKNOWN',
        razorpayRefundId: gatewayRefundId,
        amount: refundAmount,
        currency: 'INR',
        status: refundStatus,
        reason: `Return #${returnId} Passed Quality Inspection`,
        idempotencyKey: `RETURN_${returnId}_${Date.now()}`,
        processedAt: refundStatus === 'PROCESSED' ? now : null,
      },
    });

    // Update ReturnRequest to REFUNDED
    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'REFUNDED',
        inspectionResult: 'PASSED',
        inspectionNotes: notes,
        inspectedAt: now,
        refundId: gatewayRefundId || refundRecord.id,
      },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    // Update Order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'Returned',
        refundStatus: refundStatus,
        refundAmount: refundAmount,
        refundId: gatewayRefundId || refundRecord.id,
        refundProcessedAt: refundStatus === 'PROCESSED' ? now : null,
        returnedAt: now,
        paymentStatus: refundStatus === 'PROCESSED' ? 'Refunded' : order.paymentStatus,
      },
    });

    // Send customer refund email
    const customerEmail = updated.order.user?.email;
    const customerName = updated.order.fullName || updated.order.user?.name || 'Customer';

    if (customerEmail) {
      try {
        await sendEmail({
          to: customerEmail,
          subject: `Refund Processed - Order #${updated.orderId} - Home Rituals`,
          text: `Hello ${customerName},\n\nYour return for Order #${updated.orderId} has been successfully processed.\nRefund Amount: ₹${refundAmount.toFixed(2)}\nRazorpay Refund ID: ${gatewayRefundId || 'N/A'}\n\nPlease allow 5-7 business days for the funds to reflect in your source account.`,
          html: emailTemplates.getRefundProcessedHtml({
            orderId: updated.orderId,
            customerName,
            refundAmount,
            refundId: gatewayRefundId || refundRecord.id,
            processedDate: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            paymentMethod: 'Original Payment Method (Razorpay)',
          }),
        });
      } catch (emailErr) {
        logger.error(`[Email Error] Failed to send return refund email:`, emailErr);
      }
    }

    return updated;
  }

  /**
   * Admin: Record manual UPI/NEFT payout completion for COD returns
   */
  public static async recordCodPayout(adminId: string, returnId: string, input: CodPayoutInput) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundError('Return request not found');
    }

    if (returnRequest.status !== 'INSPECTION_PASSED') {
      throw new BadRequestError(`COD payout can only be recorded for returns in "INSPECTION_PASSED" status. Current status: ${returnRequest.status}`);
    }

    const isCod = returnRequest.refundType === 'COD_MANUAL' || (returnRequest.order?.paymentGateway || '').toUpperCase() === 'COD';
    if (!isCod) {
      throw new BadRequestError('This order was paid online. Prepaid orders must be refunded via the payment gateway, not manual COD payout.');
    }

    const { amount, payoutReference, notes } = input;
    const cleanRef = (payoutReference || '').trim();
    if (!cleanRef || cleanRef.length < 6 || ['unpaid', 'pending', 'none', 'n/a', 'na', 'nil', 'null', '0', 'test'].includes(cleanRef.toLowerCase())) {
      throw new BadRequestError('A valid bank UTR or UPI transaction reference (minimum 6 characters) is strictly required to record payout completion.');
    }

    const now = new Date();

    // Atomic CAS transition: ensures only ONE concurrent admin action marks payout complete
    const casUpdate = await prisma.returnRequest.updateMany({
      where: {
        id: returnId,
        status: 'INSPECTION_PASSED',
      },
      data: {
        status: 'REFUNDED',
        refundAmount: amount,
        codPayoutReference: cleanRef,
        codPaidAt: now,
        adminNotes: notes
          ? `${returnRequest.adminNotes || ''}\nCOD Payout by Admin ${adminId}. Ref: ${cleanRef}. Note: ${notes}`.trim()
          : `COD Payout by Admin ${adminId}. Ref: ${cleanRef}`,
      },
    });

    if (casUpdate.count === 0) {
      throw new BadRequestError(`Return #${returnId} has already been refunded or is not in INSPECTION_PASSED status.`);
    }

    // Create Refund record for audit trail
    const refundRecord = await prisma.refund.create({
      data: {
        orderId: returnRequest.orderId,
        userId: returnRequest.userId,
        paymentGateway: 'COD_MANUAL',
        razorpayPaymentId: cleanRef,
        razorpayRefundId: cleanRef,
        amount,
        currency: 'INR',
        status: 'PROCESSED',
        reason: `COD Return #${returnId} Manual Payout via UPI/NEFT by Admin ${adminId}. UTR: ${cleanRef}`,
        idempotencyKey: `COD_PAYOUT_${returnId}_${Date.now()}`,
        processedAt: now,
      },
    });

    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        refundId: refundRecord.id,
      },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    // Update Order
    await prisma.order.update({
      where: { id: returnRequest.orderId },
      data: {
        status: 'Returned',
        refundStatus: 'PROCESSED',
        refundAmount: amount,
        refundId: payoutReference,
        refundProcessedAt: now,
        returnedAt: now,
        paymentStatus: 'Refunded',
      },
    });

    logger.info(`[COD Payout Recorded] Return #${returnId}, Amount: ₹${amount}, UTR: ${payoutReference} by Admin: ${adminId}`);

    // Send customer COD payout confirmation email
    const customerEmail = updated.order.user?.email;
    const customerName = updated.order.fullName || updated.order.user?.name || 'Customer';

    if (customerEmail) {
      try {
        await sendEmail({
          to: customerEmail,
          subject: `Refund Transferred (UPI/Bank) - Order #${updated.orderId} - Home Rituals`,
          text: `Hello ${customerName},\n\nYour return refund of ₹${amount.toFixed(2)} for Order #${updated.orderId} has been transferred directly to your bank/UPI account.\nReference / UTR: ${payoutReference}`,
          html: emailTemplates.getCodRefundProcessedHtml({
            orderId: updated.orderId,
            customerName,
            refundAmount: amount,
            payoutReference,
            returnId: updated.id,
          }),
        });
      } catch (emailErr) {
        logger.error(`[Email Error] Failed to send COD refund notification:`, emailErr);
      }
    }

    return updated;
  }

  /**
   * Admin: Safely retry a failed gateway refund for an inspected return
   */
  public static async retryReturnRefund(adminId: string, returnId: string, notes?: string) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundError('Return request not found');
    }

    if (returnRequest.status !== 'INSPECTION_PASSED' && returnRequest.status !== 'REQUESTED') {
      throw new BadRequestError(`Cannot retry refund for return in status "${returnRequest.status}".`);
    }

    if (returnRequest.refundType === 'COD_MANUAL') {
      throw new BadRequestError('This is a COD return. Please use the Record COD Payout endpoint instead.');
    }

    const order = returnRequest.order;
    const refundAmount = returnRequest.refundAmount || order.totalAmount;

    if (!order.transactionId) {
      throw new BadRequestError('Order has no captured Razorpay payment ID to refund.');
    }

    const gatewayRefundResult = await RazorpayRefundService.createRefund({
      paymentId: order.transactionId,
      amountInRupees: refundAmount,
      orderId: order.id,
      reason: `Return #${returnId} Retry Refund by Admin`,
      notes: {
        returnId: String(returnId),
        retry: 'true',
        adminId: String(adminId),
      },
    });

    const now = new Date();

    const refundRecord = await prisma.refund.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        paymentGateway: 'Razorpay',
        razorpayPaymentId: order.transactionId,
        razorpayRefundId: gatewayRefundResult.refundId,
        amount: refundAmount,
        currency: 'INR',
        status: gatewayRefundResult.status,
        reason: `Return #${returnId} Refund Retry by Admin`,
        idempotencyKey: `RETRY_RETURN_${returnId}_${Date.now()}`,
        processedAt: gatewayRefundResult.status === 'PROCESSED' ? now : null,
      },
    });

    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'REFUNDED',
        refundId: gatewayRefundResult.refundId || refundRecord.id,
        adminNotes: notes ? `${returnRequest.adminNotes || ''}\nRetry note: ${notes}`.trim() : returnRequest.adminNotes,
      },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'Returned',
        refundStatus: gatewayRefundResult.status,
        refundAmount: refundAmount,
        refundId: gatewayRefundResult.refundId || refundRecord.id,
        refundProcessedAt: gatewayRefundResult.status === 'PROCESSED' ? now : null,
        returnedAt: now,
      },
    });

    logger.info(`[Return Refund Retried Successfully] Return #${returnId}, Razorpay Refund ID: ${gatewayRefundResult.refundId}`);
    return updated;
  }
}
