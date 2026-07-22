import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, NotFoundError } from '../utils/response';

export async function getActiveBanners(_req: Request, res: Response, next: NextFunction) {
  try {
    const banners = await prisma.banner.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, banners);
  } catch (error) {
    next(error);
  }
}

export async function getAllBanners(_req: Request, res: Response, next: NextFunction) {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, banners);
  } catch (error) {
    next(error);
  }
}

export async function createBanner(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, imageUrl, linkUrl, active } = req.body;
    const banner = await prisma.banner.create({
      data: {
        title,
        imageUrl,
        linkUrl: linkUrl || '/shop',
        active: active !== undefined ? Boolean(active) : true,
      },
    });
    return sendSuccess(res, banner, 201, 'Image banner created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateBanner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.banner.findUnique({ where: { id } as any });
    if (!existing) {
      throw new NotFoundError('Banner not found');
    }

    const { title, imageUrl, linkUrl, active } = req.body;
    const updated = await prisma.banner.update({
      where: { id } as any,
      data: {
        title: title !== undefined ? title : existing.title,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        linkUrl: linkUrl !== undefined ? linkUrl : existing.linkUrl,
        active: active !== undefined ? Boolean(active) : existing.active,
      },
    });

    return sendSuccess(res, updated, 200, 'Image banner updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteBanner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.banner.findUnique({ where: { id } as any });
    if (!existing) {
      throw new NotFoundError('Banner not found');
    }

    await prisma.banner.delete({ where: { id } as any });
    return sendSuccess(res, null, 200, 'Banner deleted successfully');
  } catch (error) {
    next(error);
  }
}
