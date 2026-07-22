import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendPaginated, NotFoundError } from '../utils/response';
import { logger } from '../utils/logger';

export async function getDashboardAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Core aggregates
    const notDeleted: any = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };
    const totalUsers = await prisma.user.count();
    const totalProducts = await prisma.product.count({ where: notDeleted });
    const outOfStockProducts = await prisma.product.count({ where: { AND: [{ stock: 0 }, notDeleted] } as any });
    const pendingReviews = await prisma.review.count({ where: { isApproved: false } });
    const newsletterSubscribers = await prisma.newsletterSubscriber.count({ where: { active: true } });

    // 2. Revenue calculation
    const revenueAggregate = await prisma.order.aggregate({
      where: { paymentStatus: 'Paid' },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const totalRevenue = revenueAggregate._sum.totalAmount || 0;
    const paidOrdersCount = revenueAggregate._count.id;
    const averageOrderValue = paidOrdersCount > 0 ? parseFloat((totalRevenue / paidOrdersCount).toFixed(2)) : 0;

    // 3. Category distribution (Product count per category)
    const categoryCounts = await prisma.category.findMany({
      where: notDeleted,
      select: {
        id: true,
        name: true,
        _count: {
          select: { products: { where: notDeleted } },
        },
      },
    });

    // 4. Monthly sales trends (for the current year/past months)
    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: 'Paid' },
      select: { totalAmount: true, createdAt: true },
    });

    const monthlySales: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize monthly tracker
    months.forEach((m) => (monthlySales[m] = 0));

    paidOrders.forEach((ord) => {
      const mName = new Date(ord.createdAt).toLocaleString('default', { month: 'short' });
      if (monthlySales[mName] !== undefined) {
        monthlySales[mName] += ord.totalAmount;
      }
    });

    const salesTrend = Object.entries(monthlySales).map(([month, total]) => ({ month, sales: total }));

    // 5. Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });

    const analytics = {
      summary: {
        totalRevenue,
        paidOrdersCount,
        averageOrderValue,
        totalUsers,
        totalProducts,
        outOfStockProducts,
        pendingReviews,
        newsletterSubscribers,
      },
      categoryDistribution: categoryCounts.map((c: any) => ({
        categoryId: c.id,
        categoryName: c.name,
        productCount: c._count?.products || 0,
      })),
      salesTrend,
      recentOrders,
    };

    return sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
}

export async function listAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, users, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id } as any,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';

    const updated = await prisma.user.update({
      where: { id } as any,
      data: { role: nextRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    logger.info(`Admin toggled role of User ID: ${id} to ${nextRole}`);
    return sendSuccess(res, updated, 200, `User role changed to ${nextRole}`);
  } catch (error) {
    next(error);
  }
}
