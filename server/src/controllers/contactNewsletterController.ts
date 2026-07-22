import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, sendPaginated, BadRequestError, NotFoundError } from '../utils/response';
import { sendEmail, emailTemplates } from '../services/email';
import { logger } from '../utils/logger';

export async function submitContactMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, subject, message } = req.body;

    const contact = await prisma.contactMessage.create({
      data: { name, email, subject, message },
    });

    // Send email confirmations
    await sendEmail({
      to: email,
      subject: `We've received your query - ${subject}`,
      html: emailTemplates.getContactFormConfirmationHtml(name, subject),
      text: `Hello ${name},\n\nWe have received your query regarding "${subject}". Our team will reply shortly.`,
    });

    logger.info(`New contact message submitted by ${name} (${email})`);
    return sendSuccess(res, contact, 201, 'Message submitted successfully');
  } catch (error) {
    next(error);
  }
}

export async function listContactMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.status = String(status);
    }

    const [messages, total] = await prisma.$transaction([
      prisma.contactMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contactMessage.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, messages, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function updateContactMessageStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Unread', 'Read', 'Replied'].includes(status)) {
      throw new BadRequestError('Invalid status value. Must be Unread, Read, or Replied.');
    }

    const msg = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!msg) {
      throw new NotFoundError('Contact message not found');
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status },
    });

    logger.info(`Contact message #${id} status updated to ${status}`);
    return sendSuccess(res, updated, 200, 'Status updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteContactMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const msg = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!msg) {
      throw new NotFoundError('Contact message not found');
    }

    await prisma.contactMessage.delete({
      where: { id },
    });

    logger.info(`Contact message #${id} deleted by admin`);
    return sendSuccess(res, null, 200, 'Message deleted successfully');
  } catch (error) {
    next(error);
  }
}

export async function subscribeNewsletter(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.active) {
        throw new BadRequestError('You are already subscribed to our newsletter.');
      }
      
      // Re-activate subscription
      const updated = await prisma.newsletterSubscriber.update({
        where: { email },
        data: { active: true },
      });

      return sendSuccess(res, updated, 200, 'Subscription re-activated successfully');
    }

    const subscriber = await prisma.newsletterSubscriber.create({
      data: { email },
    });

    // Send newsletter confirmation email
    await sendEmail({
      to: email,
      subject: 'Welcome to the Home Rituals Newsletter!',
      html: emailTemplates.getNewsletterSubscriptionHtml(),
      text: `Hello,\n\nYou have successfully subscribed to the Home Rituals newsletter.`,
    });

    logger.info(`New newsletter subscriber added: ${email}`);
    return sendSuccess(res, subscriber, 201, 'Subscribed to newsletter successfully');
  } catch (error) {
    next(error);
  }
}

export async function listNewsletterSubscribers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [subscribers, total] = await prisma.$transaction([
      prisma.newsletterSubscriber.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.newsletterSubscriber.count(),
    ]);

    const pages = Math.ceil(total / limit);

    return sendPaginated(res, subscribers, { page, limit, total, pages });
  } catch (error) {
    next(error);
  }
}

export async function updateNewsletterSubscriberStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      throw new NotFoundError('Newsletter subscriber not found');
    }

    const updated = await prisma.newsletterSubscriber.update({
      where: { id },
      data: { active: !!active },
    });

    logger.info(`Newsletter subscriber #${id} active status set to ${active}`);
    return sendSuccess(res, updated, 200, 'Subscriber status updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteNewsletterSubscriber(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      throw new NotFoundError('Newsletter subscriber not found');
    }

    await prisma.newsletterSubscriber.delete({
      where: { id },
    });

    logger.info(`Newsletter subscriber #${id} deleted by admin`);
    return sendSuccess(res, null, 200, 'Subscriber deleted successfully');
    return sendSuccess(res, null, 200, 'Subscriber deleted successfully');
  } catch (error) {
    next(error);
  }
}
