import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendPaginated, NotFoundError } from '../utils/response';
import { logger } from '../utils/logger';

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const notDeleted = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };
    const [categories, total] = await prisma.$transaction([
      prisma.category.findMany({
        where: notDeleted,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.category.count({
        where: notDeleted,
      }),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, categories, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;

    const notDeleted = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };
    const category = await prisma.category.findFirst({
      where: { AND: [{ slug }, notDeleted] },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, image } = req.body;
    
    // Auto-generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
      },
    });

    logger.info(`Category created by admin: ${category.name} (${category.slug})`);
    return sendSuccess(res, category, 201, 'Category created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;

    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const data: any = { description, image };
    if (name) {
      data.name = name;
      data.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
    }

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    logger.info(`Category updated by admin: ${updated.name}`);
    return sendSuccess(res, updated, 200, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Soft delete
    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info(`Category soft-deleted by admin: ${category.name}`);
    return sendSuccess(res, null, 200, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
}
