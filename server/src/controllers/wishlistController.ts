import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, NotFoundError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getWishlist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            originalPrice: true,
            image: true,
            stockStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, wishlist);
  } catch (error) {
    next(error);
  }
}

export async function toggleWishlist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { productId } = req.body;

    const prodIdStr = String(productId);

    const product = await prisma.product.findFirst({
      where: { id: prodIdStr, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const existing = await prisma.wishlistItem.findFirst({
      where: {
        userId,
        productId: prodIdStr,
      },
    });

    if (existing) {
      await prisma.wishlistItem.delete({
        where: { id: existing.id },
      });
      return sendSuccess(res, { inWishlist: false }, 200, 'Removed from wishlist');
    } else {
      await prisma.wishlistItem.create({
        data: { userId, productId: prodIdStr },
      });
      return sendSuccess(res, { inWishlist: true }, 200, 'Added to wishlist');
    }
  } catch (error) {
    next(error);
  }
}
