import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, BadRequestError, NotFoundError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            originalPrice: true,
            image: true,
            stock: true,
            stockStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, cartItems);
  } catch (error) {
    next(error);
  }
}

export async function addToCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { productId, quantity = 1 } = req.body;

    if (quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than zero');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestError(`Insufficient stock. Only ${product.stock} units available.`);
    }

    // Upsert cart item
    const cartItem = await prisma.cartItem.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        userId,
        productId,
        quantity,
      },
      include: { product: true },
    });

    return sendSuccess(res, cartItem, 200, 'Product added to cart');
  } catch (error) {
    next(error);
  }
}

export async function updateCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than zero');
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
      include: { product: true },
    });

    if (!cartItem) {
      throw new NotFoundError('Item not found in cart');
    }

    if (cartItem.product.stock < quantity) {
      throw new BadRequestError(`Insufficient stock. Only ${cartItem.product.stock} units available.`);
    }

    const updated = await prisma.cartItem.update({
      where: {
        userId_productId: { userId, productId },
      },
      data: { quantity },
      include: { product: true },
    });

    return sendSuccess(res, updated, 200, 'Cart item updated');
  } catch (error) {
    next(error);
  }
}

export async function removeFromCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;

    await prisma.cartItem.delete({
      where: {
        userId_productId: { userId, productId },
      },
    });

    return sendSuccess(res, null, 200, 'Item removed from cart');
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    return sendSuccess(res, null, 200, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
}
