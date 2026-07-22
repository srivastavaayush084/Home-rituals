import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendPaginated, NotFoundError, BadRequestError } from '../utils/response';
import { logger } from '../utils/logger';

export async function listBlogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 9);
    const skip = (page - 1) * limit;
    const { category, search } = req.query;

    const andConditions: any[] = [
      { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    ];

    if (category) {
      andConditions.push({ category: String(category) });
    }

    if (search) {
      const searchStr = String(search).trim();
      andConditions.push({
        OR: [
          { title: { contains: searchStr } },
          { excerpt: { contains: searchStr } },
        ],
      });
    }

    const where: any = { AND: andConditions };

    const [blogs, total] = await prisma.$transaction([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blogPost.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, blogs, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function getBlogBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(slug);

    const notDeleted = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };
    const blog = await prisma.blogPost.findFirst({
      where: isObjectId
        ? { AND: [{ id: slug }, notDeleted] }
        : { AND: [{ slug }, notDeleted] },
    });

    if (!blog) {
      throw new NotFoundError('Blog article not found');
    }

    return sendSuccess(res, blog);
  } catch (error) {
    next(error);
  }
}

export async function createBlog(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body;
    
    // Generate unique slug
    const slug = body.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    const existingBlog = await prisma.blogPost.findUnique({ where: { slug } });
    if (existingBlog) {
      throw new BadRequestError('A blog post with this title/slug already exists');
    }

    const blog = await prisma.blogPost.create({
      data: {
        title: body.title,
        slug,
        excerpt: body.excerpt,
        category: body.category,
        image: body.image,
        readTime: body.readTime,
        author: body.author,
        publishedAt: body.publishedAt,
        contentJson: body.contentJson,
      },
    });

    logger.info(`Blog post created by admin: ${blog.title}`);
    return sendSuccess(res, blog, 201, 'Blog post created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateBlog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const body = req.body;

    const blog = await prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
    });

    if (!blog) {
      throw new NotFoundError('Blog article not found');
    }

    const updateData: any = { ...body };

    if (body.title) {
      updateData.slug = body.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
    }

    const updated = await prisma.blogPost.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Blog post updated by admin: ${updated.title}`);
    return sendSuccess(res, updated, 200, 'Blog post updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteBlog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const blog = await prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
    });

    if (!blog) {
      throw new NotFoundError('Blog article not found');
    }

    // Soft delete
    await prisma.blogPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info(`Blog post soft-deleted by admin: ${blog.title}`);
    return sendSuccess(res, null, 200, 'Blog post deleted successfully');
  } catch (error) {
    next(error);
  }
}
