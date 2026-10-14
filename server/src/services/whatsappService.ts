import { logger } from '../utils/logger';

interface SendWhatsAppMessageParams {
  to: string; // Recipient phone number (E.164 format without +, e.g. 919876543210)
  type?: 'text' | 'interactive' | 'template';
  text?: { body: string };
  interactive?: any;
  template?: any;
}

interface OrderConfirmationData {
  phone: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  address: string;
  invoiceUrl?: string | null;
}

interface TrackingUpdateData {
  phone: string;
  customerName: string;
  orderId: string;
  courierName: string;
  trackingNumber: string;
  status: string;
}

/**
 * Normalizes phone numbers to standard Meta WhatsApp format (digits only, e.g. 919876543210)
 */
export function formatPhoneNumber(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  // Default to India (91) country code if 10-digit mobile is provided
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}

/**
 * Base method to dispatch messages through Meta WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(params: SendWhatsAppMessageParams): Promise<any> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

  if (!phoneId || !token) {
    logger.warn('[WhatsApp] WhatsApp credentials not configured. Skipping WhatsApp message.');
    return { success: false, reason: 'NOT_CONFIGURED' };
  }

  const recipient = formatPhoneNumber(params.to);
  const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;

  const body: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: params.type || 'text',
  };

  if (params.type === 'interactive' && params.interactive) {
    body.interactive = params.interactive;
  } else if (params.type === 'template' && params.template) {
    body.template = params.template;
  } else {
    body.type = 'text';
    body.text = params.text || { body: '' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!response.ok || data.error) {
      logger.error('[WhatsApp Send Error]:', data.error || data);
      return { success: false, error: data.error };
    }

    logger.info(`[WhatsApp] Message dispatched successfully to ${recipient} (Message ID: ${data.messages?.[0]?.id})`);
    return { success: true, messageId: data.messages?.[0]?.id, data };
  } catch (err: any) {
    logger.error('[WhatsApp Network Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends automated Order Confirmation on WhatsApp with items, total, and tracking buttons
 */
export async function sendWhatsAppOrderConfirmation(data: OrderConfirmationData): Promise<any> {
  const itemList = data.items.map((i) => `• ${i.name} (Qty: ${i.quantity}) - ₹${i.price * i.quantity}`).join('\n');

  const textBody = `🌿 *Namaste ${data.customerName}!*

Thank you for choosing *Home Rituals*. Your order has been placed successfully!

📦 *Order ID:* #${data.orderId}
💰 *Total Amount Paid:* ₹${data.totalAmount}
📍 *Delivering to:* ${data.address}

🛒 *Items Ordered:*
${itemList}

We are handcrafting and packing your ritual items with care. You can track your order status directly on WhatsApp by replying to this message!`;

  // Send interactive buttons so customer can immediately track or explore
  const interactivePayload = {
    type: 'button',
    header: {
      type: 'text',
      text: 'Order Confirmed! 🌿',
    },
    body: {
      text: textBody,
    },
    footer: {
      text: 'Home Rituals • Sacred Spaces & Aromas',
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: `TRACK_${data.orderId}`,
            title: '📦 Track Order',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'MENU_BROWSE',
            title: '🛍️ Browse Store',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'MENU_SUPPORT',
            title: '💬 Help & Support',
          },
        },
      ],
    },
  };

  return sendWhatsAppMessage({
    to: data.phone,
    type: 'interactive',
    interactive: interactivePayload,
  });
}

/**
 * Sends order dispatch & tracking update
 */
export async function sendWhatsAppTrackingUpdate(data: TrackingUpdateData): Promise<any> {
  const textBody = `🚚 *Order Shipped!*

Namaste ${data.customerName}, great news! Your Home Rituals order *#${data.orderId}* is on its way.

📦 *Courier Partner:* ${data.courierName}
🔖 *AWB / Tracking Number:* ${data.trackingNumber}
📌 *Status:* ${data.status}

Track your shipment in real time using the button below.`;

  const interactivePayload = {
    type: 'button',
    body: {
      text: textBody,
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: `TRACK_${data.orderId}`,
            title: '📍 Live Status',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'MENU_SUPPORT',
            title: '💬 Contact Support',
          },
        },
      ],
    },
  };

  return sendWhatsAppMessage({
    to: data.phone,
    type: 'interactive',
    interactive: interactivePayload,
  });
}

/**
 * Sends the Main Welcome Store Menu with quick-reply buttons
 */
export async function sendWhatsAppMainMenu(to: string, greetingName = 'Customer'): Promise<any> {
  const textBody = `Namaste ${greetingName}! Welcome to *Home Rituals* 🌿✨

Discover our hand-poured diffusers, pure essential oils, sacred pooja rituals, and mindful home fragrances.

How may we assist your ritual today?`;

  const interactivePayload = {
    type: 'button',
    header: {
      type: 'text',
      text: 'Home Rituals Virtual Concierge',
    },
    body: {
      text: textBody,
    },
    footer: {
      text: 'Select an option below to continue',
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: 'MENU_BROWSE',
            title: '🛍️ Browse Catalog',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'MENU_TRACK',
            title: '📦 Track My Order',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'MENU_SUPPORT',
            title: '💬 Talk to Support',
          },
        },
      ],
    },
  };

  return sendWhatsAppMessage({
    to,
    type: 'interactive',
    interactive: interactivePayload,
  });
}

/**
 * Sends interactive category list menu
 */
export async function sendWhatsAppCategoryMenu(to: string, categories: Array<{ id: string; name: string; description?: string | null }>): Promise<any> {
  const rows = categories.slice(0, 10).map((cat) => ({
    id: `CAT_${cat.id}`,
    title: cat.name.substring(0, 24),
    description: (cat.description || `Explore ${cat.name}`).substring(0, 72),
  }));

  const interactivePayload = {
    type: 'list',
    header: {
      type: 'text',
      text: 'Home Rituals Collections 🌿',
    },
    body: {
      text: 'Choose a sacred collection below to view our handcrafted products, pricing, and ingredients.',
    },
    footer: {
      text: 'Tap View Collections to browse',
    },
    action: {
      button: 'View Collections',
      sections: [
        {
          title: 'Store Collections',
          rows,
        },
      ],
    },
  };

  return sendWhatsAppMessage({
    to,
    type: 'interactive',
    interactive: interactivePayload,
  });
}

/**
 * Sends products in a selected category with details and direct store links
 */
export async function sendWhatsAppProductList(to: string, categoryName: string, products: Array<{ id: string; name: string; price: number; discountPrice?: number | null; slug: string }>): Promise<any> {
  if (products.length === 0) {
    return sendWhatsAppMessage({
      to,
      type: 'text',
      text: {
        body: `Currently all items in *${categoryName}* are being handcrafted. Check back soon or visit https://homerituals.com/shop`,
      },
    });
  }

  let textBody = `🌿 *${categoryName} Collection*\n\nHere are our top handcrafted picks:\n\n`;

  products.slice(0, 5).forEach((p, index) => {
    const finalPrice = p.discountPrice || p.price;
    const strikePrice = p.discountPrice ? ` ~(₹${p.price})~` : '';
    textBody += `*${index + 1}. ${p.name}*\n`;
    textBody += `💰 Price: ₹${finalPrice}${strikePrice}\n`;
    textBody += `🔗 Order: https://homerituals.com/product/${p.slug}\n\n`;
  });

  textBody += `Reply *Menu* anytime to return to main options.`;

  return sendWhatsAppMessage({
    to,
    type: 'text',
    text: { body: textBody },
  });
}
