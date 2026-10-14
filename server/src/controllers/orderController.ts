import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendPaginated, BadRequestError, NotFoundError, ForbiddenError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendEmail, emailTemplates } from '../services/email';
import { logger } from '../utils/logger';
import { generateInvoiceNumber, generateInvoicePDFBuffer } from '../services/invoiceService';
import { executeOrderCancellation } from '../services/orderCancellationService';
import { initiatePaymentDirect } from './paymentController';
import { sendWhatsAppTrackingUpdate } from '../services/whatsappService';

/**
 * Creates/initiates an order. Delegated to canonical initiatePaymentDirect to ensure
 * atomic CheckoutSession snapshots and prevent pre-payment stock deduction leaks.
 */
export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return initiatePaymentDirect(req, res, next);
}

export async function listUserOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { userId } as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, image: true },
              },
            },
          },
          refunds: true,
        },
      }) as any,
      prisma.order.count({ where: { userId } as any }),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, orders, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id } as any,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, image: true, slug: true },
            },
          },
        },
        refunds: true,
      },
    }) as any;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify user owns the order, or is an admin
    if (String(order.userId) !== String(req.user!.id) && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have access to view this order');
    }

    return sendSuccess(res, order);
  } catch (error) {
    next(error);
  }
}

export async function listAllOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const { status, refundStatus } = req.query;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (refundStatus && refundStatus !== 'all') {
      where.refundStatus = String(refundStatus);
    }

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
          refunds: true,
        },
      }) as any,
      prisma.order.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, orders, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, courierName, trackingNumber } = req.body;

    const order: any = await prisma.order.findUnique({
      where: { id } as any,
      include: { items: true, user: { select: { email: true } } },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const updateData: any = { status };

    if (courierName) updateData.courierName = courierName;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;

    // Track state timestamps
    if (status === 'Shipped') {
      updateData.shippedAt = new Date();
    } else if (status === 'Delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'Cancelled') {
      updateData.cancelledAt = new Date();
    } else if (status === 'Returned') {
      updateData.returnedAt = new Date();
    } else if (status === 'Refunded') {
      updateData.refundedAt = new Date();
      updateData.paymentStatus = 'Refunded';
    }

    // Handle inventory adjustments inside transaction if order is cancelled/returned
    if ((status === 'Cancelled' || status === 'Returned') && order.status !== 'Cancelled' && order.status !== 'Returned') {
      await prisma.$transaction(async (tx: any) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId } as any,
            data: {
              stock: { increment: item.quantity },
              stockStatus: 'In Stock',
            },
          });
        }
      });
    }

    const updated = await prisma.order.update({
      where: { id } as any,
      data: updateData,
    });

    // Send email alert to user
    const userEmail = order.user?.email || req.user!.email;
    if (userEmail) {
      await sendEmail({
        to: userEmail,
        subject: `Order Update: #${order.id} - ${status}`,
        html: emailTemplates.getOrderStatusUpdateHtml(order.id, status, courierName, trackingNumber),
        text: `Hello,\n\nYour order #${order.id} status is now: ${status}.`,
      });
    }

    // Send WhatsApp tracking notification to customer
    if (status === 'Shipped' && order.phone && (trackingNumber || order.trackingNumber)) {
      try {
        await sendWhatsAppTrackingUpdate({
          phone: order.phone,
          customerName: order.fullName,
          orderId: order.id,
          courierName: courierName || order.courierName || 'Standard Delivery',
          trackingNumber: trackingNumber || order.trackingNumber || 'Available in account',
          status: 'Shipped',
        });
        logger.info(`WhatsApp dispatch update sent for Order #${order.id} to ${order.phone}`);
      } catch (waErr) {
        logger.error(`Error sending WhatsApp tracking update for Order #${order.id}:`, waErr);
      }
    }

    logger.info(`Order #${id} status updated to ${status} by admin`);
    return sendSuccess(res, updated, 200, 'Order status updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { id } = req.params;
    const { reason, comment } = req.body;

    const result = await executeOrderCancellation({
      orderId: id,
      userId,
      userRole,
      reason: reason || 'Changed my mind',
      comment,
      cancelledBy: userRole === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
    });

    let message = 'Order cancelled successfully';
    if (result.isOnlinePaid) {
      if (result.refundStatus === 'PROCESSED') {
        message = `Order cancelled. Refund of ₹${result.refundAmount} has been processed successfully.`;
      } else if (result.refundStatus === 'PROCESSING' || result.refundStatus === 'PENDING') {
        message = `Order cancelled. Refund of ₹${result.refundAmount} has been initiated via Razorpay.`;
      } else if (result.refundStatus === 'FAILED') {
        message = 'Order cancelled. Refund could not be initiated automatically and will be processed manually by support.';
      }
    }

    return sendSuccess(res, result.order, 200, message);
  } catch (error) {
    next(error);
  }
}

export async function downloadOrderInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id } as any,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, image: true, price: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }) as any;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify user owns the order, or is an admin
    if (String(order.userId) !== String(req.user!.id) && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have access to view or download this invoice');
    }

    // Ensure order is paid/confirmed/delivered
    const allowedPayment = order.paymentStatus === 'Paid' || order.status === 'Confirmed' || order.status === 'Delivered' || order.status === 'Shipped';
    if (!allowedPayment) {
      throw new BadRequestError('Invoice is only available for paid or confirmed orders');
    }

    // Auto-generate invoice number if missing (legacy orders)
    let invoiceNumber = order.invoiceNumber;
    let invoiceDate = order.invoiceDate;

    if (!invoiceNumber) {
      invoiceNumber = await generateInvoiceNumber();
      invoiceDate = new Date();
      await prisma.order.update({
        where: { id: order.id } as any,
        data: {
          invoiceNumber,
          invoiceDate,
          invoiceGeneratedAt: invoiceDate,
        } as any,
      });
      order.invoiceNumber = invoiceNumber;
      order.invoiceDate = invoiceDate;
    }

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDFBuffer(order);

    const safeFilename = `HomeRituals-Invoice-${invoiceNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    logger.info(`Invoice downloaded for Order #${order.id} (${invoiceNumber}) by user ${req.user!.id}`);
    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

