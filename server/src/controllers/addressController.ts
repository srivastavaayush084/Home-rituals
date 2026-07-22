import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, NotFoundError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export async function listAddresses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return sendSuccess(res, addresses);
  } catch (error) {
    next(error);
  }
}

export async function createAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const body = req.body;

    // If setting as default, unset others first
    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // Check if this is the first address, make it default automatically
    const count = await prisma.address.count({ where: { userId } });
    const isDefault = count === 0 ? true : !!body.isDefault;

    const address = await prisma.address.create({
      data: {
        userId,
        fullName: body.fullName,
        address1: body.address1,
        address2: body.address2,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country || 'India',
        landmark: body.landmark,
        phone: body.phone,
        isDefault,
      },
    });

    return sendSuccess(res, address, 201, 'Address created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const body = req.body;

    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: body,
    });

    return sendSuccess(res, updated, 200, 'Address updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    await prisma.address.delete({
      where: { id },
    });

    // If we deleted the default address, make the next newest one default
    if (address.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return sendSuccess(res, null, 200, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
}
