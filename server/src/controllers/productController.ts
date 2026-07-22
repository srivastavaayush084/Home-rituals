import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendPaginated, NotFoundError, BadRequestError } from '../utils/response';
import { logger } from '../utils/logger';
import { deleteImage, getPublicIdFromUrl } from '../services/cloudinary';

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 12);
    const skip = (page - 1) * limit;

    const {
      search,
      category,
      concern,
      collection,
      minPrice,
      maxPrice,
      minRating,
      featured,
      sort,
    } = req.query;

    const andConditions: any[] = [
      { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    ];

    // Search query
    if (search) {
      const searchStr = String(search).trim();
      andConditions.push({
        OR: [
          { name: { contains: searchStr } },
          { description: { contains: searchStr } },
          { tags: { has: searchStr } },
        ],
      });
    }

    // Category filter (support category slug or ID)
    if (category) {
      const catStr = String(category);
      if (/^[0-9a-fA-F]{24}$/.test(catStr)) {
        andConditions.push({ categoryId: catStr });
      } else {
        andConditions.push({ category: { slug: catStr } });
      }
    }

    // Category sub-attributes filters
    if (concern) andConditions.push({ concern: String(concern) });
    if (collection) andConditions.push({ collection: String(collection) });

    // Price range filters
    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) priceFilter.gte = Number(minPrice);
      if (maxPrice) priceFilter.lte = Number(maxPrice);
      andConditions.push({ price: priceFilter });
    }

    // Average rating filters
    if (minRating) {
      andConditions.push({ rating: { gte: Number(minRating) } });
    }

    // Featured items
    if (featured === 'true') {
      andConditions.push({ featured: true });
    }

    const where: any = { AND: andConditions };

    // Sorting parameters
    let orderBy: any = { createdAt: 'desc' };
    if (sort) {
      switch (String(sort)) {
        case 'price-asc':
          orderBy = { price: 'asc' };
          break;
        case 'price-desc':
          orderBy = { price: 'desc' };
          break;
        case 'rating':
          orderBy = { rating: 'desc' };
          break;
        case 'popularity':
          orderBy = { reviewsCount: 'desc' };
          break;
        case 'newest':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, products, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function getProductBySlugOrId(req: Request, res: Response, next: NextFunction) {
  try {
    const { identifier } = req.params;
    let product;

    if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
      product = await prisma.product.findFirst({
        where: { id: identifier, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          reviews: {
            where: { isApproved: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    } else {
      product = await prisma.product.findFirst({
        where: { slug: identifier, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          reviews: {
            where: { isApproved: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    }

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body;
    
    // Auto slug creation
    const slug = body.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    const existingProduct = await prisma.product.findFirst({
      where: { OR: [{ slug }, { sku: body.sku }] },
    });
    if (existingProduct) {
      throw new BadRequestError('Product with this name or SKU already exists');
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        sku: body.sku,
        description: body.description,
        shortDescription: body.shortDescription,
        price: body.price,
        originalPrice: body.originalPrice,
        discountPrice: body.discountPrice,
        badge: body.badge,
        stock: body.stock,
        featured: body.featured || false,
        image: body.image,
        images: body.images || [],
        tags: body.tags || [],
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        ingredients: body.ingredients,
        usageInstructions: body.usageInstructions,
        benefits: body.benefits,
        faqs: body.faqs || [],
        categoryId: body.categoryId,
        concern: body.concern,
        collection: body.collection,
        variant: body.variant,
        packSize: body.packSize,
        stockStatus: body.stock > 0 ? 'In Stock' : 'Out of Stock',
        materials: body.materials,
        careInstructions: body.careInstructions,
        shippingReturns: body.shippingReturns,
      },
    });

    logger.info(`Product created by admin: ${product.name} (SKU: ${product.sku})`);
    return sendSuccess(res, product, 201, 'Product created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const body = req.body;

    const product = await prisma.product.findFirst({
      where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updateData: any = { ...body };

    // Clean up old Cloudinary images if replacement image URL is provided
    if (body.image && body.image !== product.image) {
      const oldPublicId = getPublicIdFromUrl(product.image);
      if (oldPublicId) {
        await deleteImage(oldPublicId);
      }
    }

    // Clean up old gallery images if replacing
    if (body.images && Array.isArray(body.images)) {
      const removedImages = product.images.filter(x => !body.images.includes(x));
      for (const imgUrl of removedImages) {
        const publicId = getPublicIdFromUrl(imgUrl);
        if (publicId) {
          await deleteImage(publicId);
        }
      }
    }

    if (body.name) {
      updateData.slug = body.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
    }

    if (body.stock !== undefined) {
      updateData.stockStatus = body.stock > 0 ? 'In Stock' : 'Out of Stock';
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Product updated by admin: ${updated.name}`);
    return sendSuccess(res, updated, 200, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Cleanup images from Cloudinary to preserve space
    const mainPublicId = getPublicIdFromUrl(product.image);
    if (mainPublicId) {
      await deleteImage(mainPublicId);
    }

    for (const imgUrl of product.images) {
      const publicId = getPublicIdFromUrl(imgUrl);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    logger.info(`Product soft-deleted by admin: ${product.name} (ID: ${product.id})`);
    return sendSuccess(res, null, 200, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
}
