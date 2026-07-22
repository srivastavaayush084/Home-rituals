import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendPaginated, BadRequestError, NotFoundError, ForbiddenError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import { createRazorpayOrder } from '../services/razorpay';
import { sendEmail, emailTemplates } from '../services/email';
import { logger } from '../utils/logger';

export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { addressId } = req.body;

    // Use transaction to ensure inventory safety and consistency
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Get user's cart
      const cartItems = await tx.cartItem.findMany({
        where: { userId } as any,
        include: { product: true },
      });

      if (cartItems.length === 0) {
        throw new BadRequestError('Your cart is empty');
      }

      // 2. Validate inventory stock and calculate totals
      let totalAmount = 0;
      const itemsToCreate = [];

      for (const item of cartItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId } as any,
        });

        if (!product || product.deletedAt) {
          throw new BadRequestError(`Product "${item.product?.name || 'Item'}" is no longer available`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestError(`Insufficient stock for "${product.name}". Only ${product.stock} available.`);
        }

        // Calculate item price (use discount price if present, else standard price)
        const price = product.discountPrice || product.price;
        totalAmount += price * item.quantity;

        itemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          price,
          name: product.name,
        });
      }

      // 3. Reserve inventory stock
      for (const item of itemsToCreate) {
        const product = await tx.product.findUnique({ where: { id: item.productId } as any });
        const newStock = product!.stock - item.quantity;
        await tx.product.update({
          where: { id: item.productId } as any,
          data: {
            stock: newStock,
            stockStatus: newStock > 0 ? 'In Stock' : 'Out of Stock',
          },
        });
      }

      // 4. Retrieve shipping address
      const address = await tx.address.findFirst({
        where: { id: addressId, userId } as any,
      });

      if (!address) {
        throw new BadRequestError('Shipping address not found');
      }

      // 5. Create Order
      const order = await tx.order.create({
        data: {
          userId,
          fullName: address.fullName,
          address1: address.address1,
          address2: address.address2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          landmark: address.landmark,
          phone: address.phone,
          totalAmount,
          status: 'Pending',
          paymentStatus: 'Pending',
        } as any,
      });

      // 6. Create OrderItems
      await tx.orderItem.createMany({
        data: itemsToCreate.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })) as any,
      });

      // 7. Clear user's cart
      await tx.cartItem.deleteMany({ where: { userId } as any });

      return { order, itemsToCreate };
    });

    const { order, itemsToCreate } = result;

    // 8. Integrate with Razorpay (Create Razorpay Order)
    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(order.totalAmount * 100);
    const razorpayOrder = await createRazorpayOrder(amountInPaise, order.id.toString());

    // Update order with razorpayOrderId
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    // 9. Send email notification
    await sendEmail({
      to: req.user!.email,
      subject: `Order Created! - #${order.id}`,
      html: emailTemplates.getOrderConfirmationHtml(order.id, order.totalAmount, itemsToCreate),
      text: `Hello ${order.fullName},\n\nYour order #${order.id} has been created. Total amount: ₹${order.totalAmount}.`,
    });

    logger.info(`Order placed successfully: #${order.id} for user ID: ${userId}`);
    return sendSuccess(res, { order: updatedOrder, razorpayOrder }, 201, 'Order created successfully');
  } catch (error) {
    next(error);
  }
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
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.status = String(status);
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
    await sendEmail({
      to: order.user?.email || req.user!.email,
      subject: `Order Update: #${order.id} - ${status}`,
      html: emailTemplates.getOrderStatusUpdateHtml(order.id, status, courierName, trackingNumber),
      text: `Hello,\n\nYour order #${order.id} status is now: ${status}.`,
    });

    logger.info(`Order #${id} status updated to ${status} by admin`);
    return sendSuccess(res, updated, 200, 'Order status updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const order: any = await prisma.order.findFirst({
      where: { id, userId } as any,
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Can only cancel pending or confirmed orders
    if (order.status !== 'Pending' && order.status !== 'Confirmed') {
      throw new BadRequestError('This order cannot be cancelled as it is already being processed or shipped');
    }

    // Return stock to inventory and mark order cancelled
    const updated = await prisma.$transaction(async (tx: any) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId } as any,
          data: {
            stock: { increment: item.quantity },
            stockStatus: 'In Stock',
          },
        });
      }

      return await tx.order.update({
        where: { id } as any,
        data: {
          status: 'Cancelled',
          cancelledAt: new Date(),
        },
      });
    });

    // Send cancel notification email
    await sendEmail({
      to: req.user!.email,
      subject: `Order Cancelled - #${order.id}`,
      html: emailTemplates.getOrderStatusUpdateHtml(order.id, 'Cancelled'),
      text: `Hello ${order.fullName},\n\nYour order #${order.id} has been cancelled successfully.`,
    });

    logger.info(`Order #${id} cancelled by customer ID: ${userId}`);
    return sendSuccess(res, updated, 200, 'Order cancelled successfully');
  } catch (error) {
    next(error);
  }
}
