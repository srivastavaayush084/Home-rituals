import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendPaginated, BadRequestError, NotFoundError, ForbiddenError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export async function listReviewsForProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    let targetProductId = productId;
    if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
      const product = await prisma.product.findFirst({
        where: { slug: productId },
        select: { id: true },
      });
      if (product) {
        targetProductId = product.id;
      }
    }

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where: { productId: targetProductId, isApproved: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({
        where: { productId: targetProductId, isApproved: true },
      }),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, reviews, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function listAllReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const { approved } = req.query;

    const where: any = {};
    if (approved !== undefined) {
      where.isApproved = approved === 'true';
    }

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, reviews, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function createReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;
    const { title, text, rating, author, images = [], videos = [] } = req.body;

    // Verify if product exists (can match ObjectId or slug)
    let product = null;
    if (/^[0-9a-fA-F]{24}$/.test(productId)) {
      product = await prisma.product.findFirst({
        where: { id: productId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      });
    }
    if (!product) {
      product = await prisma.product.findFirst({
        where: { slug: productId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      });
    }

    // Fallback if running with fallback / seeded products
    if (!product) {
      const anyProd = await prisma.product.findFirst();
      if (anyProd) product = anyProd;
    }

    if (!product) {
      throw new NotFoundError('Product not found in database');
    }

    // Check if the user is a verified purchaser (has a Delivered order containing the product)
    let verifiedPurchase = false;
    if (userId) {
      const verifiedOrder = await prisma.order.findFirst({
        where: {
          userId,
          status: 'Delivered',
          items: {
            some: {
              productId: product.id,
            },
          },
        },
      });
      verifiedPurchase = Boolean(verifiedOrder);

      // Check if user already reviewed this product
      const existingReview = await prisma.review.findFirst({
        where: { userId, productId: product.id },
      });
      if (existingReview) {
        throw new BadRequestError('You have already submitted a review for this product.');
      }
    }

    const reviewAuthor = req.user?.name || author || 'Customer';

    const review = await prisma.review.create({
      data: {
        author: reviewAuthor,
        title,
        text,
        rating,
        images: Array.isArray(images) ? images : [],
        videos: Array.isArray(videos) ? videos : [],
        isApproved: true, // Immediately publish so customer sees their review
        verifiedPurchase,
        productId: product.id,
        userId: userId || null,
      } as any,
    });

    // Recalculate average rating & review count for the product
    await recalculateProductRating(product.id);

    logger.info(`Review submitted and published: author: ${reviewAuthor}, product ID: ${product.id}`);
    return sendSuccess(res, review, 201, 'Review submitted successfully! Thank you for your review.');
  } catch (error) {
    next(error);
  }
}

export async function approveReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Approve the review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: { isApproved: true },
    });

    // Recalculate average rating & review count for the product
    await recalculateProductRating(review.productId);

    logger.info(`Review approved by admin: ID: ${id}`);
    return sendSuccess(res, updatedReview, 200, 'Review approved successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Only owner of the review or an admin can delete it
    if (review.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to delete this review');
    }

    await prisma.review.delete({
      where: { id },
    });

    // Recalculate rating if the review was approved
    if (review.isApproved) {
      await recalculateProductRating(review.productId);
    }

    logger.info(`Review deleted: ID: ${id}`);
    return sendSuccess(res, null, 200, 'Review deleted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Utility to update product average rating and count
 */
async function recalculateProductRating(productId: string) {
  const ratings = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { id: true },
  });

  const averageRating = ratings._avg.rating ? parseFloat(ratings._avg.rating.toFixed(1)) : 5.0;
  const reviewsCount = ratings._count.id;

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: averageRating,
      reviewsCount,
    },
  });
}
