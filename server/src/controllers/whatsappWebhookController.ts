import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { logger } from '../utils/logger';
import {
  sendWhatsAppMainMenu,
  sendWhatsAppCategoryMenu,
  sendWhatsAppProductList,
  sendWhatsAppMessage,
} from '../services/whatsappService';

/**
 * Handles Meta Webhook Verification Handshake (GET /api/whatsapp/webhook)
 */
export async function verifyWebhook(req: Request, res: Response): Promise<any> {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'hr_wa_verify_9b83f01c7a8e42d65e90';

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info('[WhatsApp Webhook] Handshake verified successfully with Meta!');
    return res.status(200).send(challenge);
  }

  logger.warn('[WhatsApp Webhook] Verification token mismatch received:', token);
  return res.status(403).json({ error: 'Verification token mismatch' });
}

/**
 * Handles Incoming WhatsApp Messages, Quick Replies, and List Clicks (POST /api/whatsapp/webhook)
 */
export async function handleIncomingWebhook(req: Request, res: Response): Promise<any> {
  // Acknowledge Meta immediately to avoid timeouts
  res.status(200).json({ status: 'EVENT_RECEIVED' });

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (!message) {
      return; // Status delivery receipt or ping
    }

    const senderPhone = message.from; // Sender's WhatsApp number
    const senderName = contact?.profile?.name || 'Customer';

    logger.info(`[WhatsApp Inbound] Message received from ${senderPhone} (${senderName}): Type=${message.type}`);

    // 1. Handle Interactive Button / List Replies
    if (message.type === 'interactive') {
      const interactive = message.interactive;
      const buttonId = interactive?.button_reply?.id;
      const listId = interactive?.list_reply?.id;
      const selectedId = buttonId || listId;

      await handleUserSelection(senderPhone, senderName, selectedId);
      return;
    }

    // 2. Handle Text Messages
    if (message.type === 'text') {
      const text = message.text?.body?.trim().toLowerCase() || '';

      if (text.includes('track') || text.includes('status')) {
        await handleTrackOrder(senderPhone);
      } else if (text.includes('browse') || text.includes('catalog') || text.includes('shop') || text.includes('products')) {
        await handleBrowseCatalog(senderPhone);
      } else if (text.includes('support') || text.includes('help') || text.includes('call')) {
        await handleSupport(senderPhone);
      } else {
        // Default: Send Interactive Welcome Menu
        await sendWhatsAppMainMenu(senderPhone, senderName);
      }
      return;
    }

    // Default fallback
    await sendWhatsAppMainMenu(senderPhone, senderName);
  } catch (error: any) {
    logger.error('[WhatsApp Webhook Processing Error]:', error);
  }
}

/**
 * Router for interactive button & list IDs
 */
async function handleUserSelection(senderPhone: string, senderName: string, selectedId?: string) {
  if (!selectedId) {
    await sendWhatsAppMainMenu(senderPhone, senderName);
    return;
  }

  if (selectedId === 'MENU_BROWSE') {
    await handleBrowseCatalog(senderPhone);
  } else if (selectedId === 'MENU_TRACK') {
    await handleTrackOrder(senderPhone);
  } else if (selectedId === 'MENU_SUPPORT') {
    await handleSupport(senderPhone);
  } else if (selectedId.startsWith('CAT_')) {
    const categoryId = selectedId.replace('CAT_', '');
    await handleCategorySelection(senderPhone, categoryId);
  } else if (selectedId.startsWith('TRACK_')) {
    const orderId = selectedId.replace('TRACK_', '');
    await handleSpecificOrderTrack(senderPhone, orderId);
  } else {
    await sendWhatsAppMainMenu(senderPhone, senderName);
  }
}

/**
 * Queries categories and sends interactive list menu
 */
async function handleBrowseCatalog(senderPhone: string) {
  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      select: { id: true, name: true, description: true },
      take: 10,
    });

    if (categories.length === 0) {
      await sendWhatsAppMessage({
        to: senderPhone,
        type: 'text',
        text: { body: 'Explore our full collection online at https://homerituals.com/shop' },
      });
      return;
    }

    await sendWhatsAppCategoryMenu(senderPhone, categories);
  } catch (err: any) {
    logger.error('Error in handleBrowseCatalog:', err);
  }
}

/**
 * Queries products in selected category and sends product summary with store links
 */
async function handleCategorySelection(senderPhone: string, categoryId: string) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });

    const categoryName = category?.name || 'Handcrafted Rituals';

    const products = await prisma.product.findMany({
      where: {
        categoryId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
        slug: true,
      },
      take: 5,
    });

    await sendWhatsAppProductList(senderPhone, categoryName, products);
  } catch (err: any) {
    logger.error('Error in handleCategorySelection:', err);
  }
}

/**
 * Tracks the most recent order for this customer phone number
 */
async function handleTrackOrder(senderPhone: string) {
  try {
    // Strip country code (91) to match 10-digit phone in DB or search endsWith
    const rawNumber = senderPhone.replace(/^91/, '');

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { phone: { contains: rawNumber } },
          { phone: { contains: senderPhone } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    if (!order) {
      await sendWhatsAppMessage({
        to: senderPhone,
        type: 'text',
        text: {
          body: `We couldn't find any recent orders associated with your WhatsApp number (${senderPhone}).\n\nIf you placed an order with a different phone number, please contact our support team at info@homerituals.co or visit https://homerituals.com/profile.`,
        },
      });
      return;
    }

    const itemSummary = order.items.map((i) => i.product?.name || 'Item').join(', ');
    const trackingMsg = order.trackingNumber
      ? `\n🚚 *Courier:* ${order.courierName || 'Standard'}\n🔖 *Tracking AWB:* ${order.trackingNumber}`
      : '\n🚚 *Shipping:* Preparing for dispatch';

    const statusText = `📦 *Order Status Update*

*Order ID:* #${order.id}
*Status:* ${order.status} (${order.paymentStatus})
*Amount:* ₹${order.totalAmount}
*Items:* ${itemSummary}${trackingMsg}

Need more help? Reply *Support* to chat with us.`;

    await sendWhatsAppMessage({
      to: senderPhone,
      type: 'text',
      text: { body: statusText },
    });
  } catch (err: any) {
    logger.error('Error in handleTrackOrder:', err);
  }
}

/**
 * Tracks a specific Order ID
 */
async function handleSpecificOrderTrack(senderPhone: string, orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    if (!order) {
      await sendWhatsAppMessage({
        to: senderPhone,
        type: 'text',
        text: { body: `Order #${orderId} was not found.` },
      });
      return;
    }

    const trackingMsg = order.trackingNumber
      ? `\n🚚 *Courier:* ${order.courierName || 'Standard'}\n🔖 *Tracking AWB:* ${order.trackingNumber}`
      : '\n🚚 *Shipping:* In preparation for dispatch';

    await sendWhatsAppMessage({
      to: senderPhone,
      type: 'text',
      text: {
        body: `📦 *Order #${order.id}*\n*Status:* ${order.status}\n*Total:* ₹${order.totalAmount}${trackingMsg}\n\nTrack online at https://homerituals.com/orders`,
      },
    });
  } catch (err: any) {
    logger.error('Error in handleSpecificOrderTrack:', err);
  }
}

/**
 * Sends support contact information
 */
async function handleSupport(senderPhone: string) {
  const supportText = `🌿 *Home Rituals Customer Care*

We are here to assist with your orders, custom hampers, and sacred wellness inquiries.

📧 *Email:* info@homerituals.co
🕒 *Hours:* Monday – Saturday | 10:00 AM – 7:00 PM IST
🌐 *Website:* https://homerituals.com

Please reply with your query here, and our ritual specialist will get back to you shortly!`;

  await sendWhatsAppMessage({
    to: senderPhone,
    type: 'text',
    text: { body: supportText },
  });
}
