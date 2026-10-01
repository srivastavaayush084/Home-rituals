import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Create nodemailer transporter
const host = process.env.EMAIL_HOST;
const port = Number(process.env.EMAIL_PORT) || 587;
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const from = process.env.EMAIL_FROM || '"Home Rituals" <no-reply@homerituals.com>';

let transporter: nodemailer.Transporter | null = null;

if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for others
    auth: {
      user,
      pass,
    },
  });
} else {
  logger.info('SMTP configurations not fully provided. Email service will run in MOCK mode (logging to console).');
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
        attachments,
      });
      logger.info(`Email successfully sent to ${to}: "${subject}"${attachments?.length ? ` with ${attachments.length} attachment(s)` : ''}`);
    } catch (error) {
      logger.error(`Error sending email to ${to}:`, error);
    }
  } else {
    // Mock logging
    logger.info(`
========================================
[MOCK EMAIL SENT]
To: ${to}
Subject: ${subject}
Attachments: ${attachments?.map(a => a.filename).join(', ') || 'None'}
Text Content: ${text}
HTML Content: (Omitted, check log files or code if needed)
========================================
    `);
  }
}

// Transactional templates helper
export const emailTemplates = {
  getRegistrationHtml: (name: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
      <h2 style="color: #0B8F3C;">Welcome to Home Rituals, ${name}!</h2>
      <p>Thank you for registering an account with us. We are thrilled to have you join our circle of home care rituals.</p>
      <p>Explore our catalog of premium home hygiene essentials designed for clean, calm living.</p>
      <div style="margin: 25px 0;">
        <a href="https://homerituals.co" style="background-color: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold;">Start Shopping</a>
      </div>
      <p>If you have any questions, simply reply to this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">&copy; Home Rituals. All rights reserved.</p>
    </div>
  `,

  getPasswordResetHtml: (resetUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
      <h2 style="color: #242424;">Password Reset Request</h2>
      <p>You requested to reset your password for your Home Rituals account.</p>
      <p>Please click the button below to set a new password. This link is valid for 1 hour.</p>
      <div style="margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #0B8F3C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you did not request this password reset, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">&copy; Home Rituals. All rights reserved.</p>
    </div>
  `,

  getOrderConfirmationHtml: (orderId: string | number, total: number, items: { name: string; quantity: number; price: number }[]) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
      <h2 style="color: #0B8F3C;">Order Confirmed!</h2>
      <p>Thank you for your order! We have received your order <strong>#${orderId}</strong> and are preparing it for packaging.</p>
      <h3>Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="border-bottom: 1px solid #eee;">
            <th style="text-align: left; padding: 8px;">Item</th>
            <th style="text-align: center; padding: 8px;">Qty</th>
            <th style="text-align: right; padding: 8px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr style="border-bottom: 1px solid #f9f9f9;">
              <td style="padding: 8px;">${item.name}</td>
              <td style="padding: 8px; text-align: center;">${item.quantity}</td>
              <td style="padding: 8px; text-align: right;">₹${item.price * item.quantity}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="2" style="padding: 8px; font-weight: bold; text-align: right;">Total Amount:</td>
            <td style="padding: 8px; font-weight: bold; text-align: right; color: #0B8F3C;">₹${total}</td>
          </tr>
        </tbody>
      </table>
      <p>You can check the status of your order at any time by visiting your profile dashboard.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">&copy; Home Rituals. All rights reserved.</p>
    </div>
  `,

  getPaymentSuccessHtml: (orderId: string | number, paymentId: string, amount: number, gateway: string = 'Razorpay') => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
      <h2 style="color: #0B8F3C;">Payment Successful</h2>
      <p>Your payment of <strong>₹${amount}</strong> for Order <strong>#${orderId}</strong> has been successfully processed.</p>
      <p><strong>Payment Gateway:</strong> ${gateway}</p>
      <p><strong>Transaction ID:</strong> ${paymentId}</p>
      <p>Your order is now being processed and packed by our team. We'll update you as soon as it ships!</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">&copy; Home Rituals. All rights reserved.</p>
    </div>
  `,

  getOrderStatusUpdateHtml: (orderId: string | number, status: string, courierName?: string, trackingNumber?: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
      <h2 style="color: #242424;">Order Status Update: ${status}</h2>
      <p>The status of your order <strong>#${orderId}</strong> has changed to <strong>${status}</strong>.</p>
      ${courierName && trackingNumber ? `
        <div style="background-color: #f8fbf8; padding: 15px; border-radius: 8px; border: 1px solid #e8efe7; margin: 15px 0;">
          <p style="margin: 0; font-weight: bold; color: #0B8F3C;">Shipping Details</p>
          <p style="margin: 5px 0 0 0;">Courier: ${courierName}</p>
          <p style="margin: 5px 0 0 0;">Tracking Number: ${trackingNumber}</p>
        </div>
      ` : ''}
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">&copy; Home Rituals. All rights reserved.</p>
    </div>
  `,

  getContactFormConfirmationHtml: (name: string, subject: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
      <h2 style="color: #0B8F3C;">Message Received, ${name}</h2>
      <p>Thank you for reaching out to us. We have received your query regarding <strong>"${subject}"</strong>.</p>
      <p>Our support team will review your message and get back to you within 24 to 48 business hours.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">&copy; Home Rituals. All rights reserved.</p>
    </div>
  `,

  getNewsletterSubscriptionHtml: () => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
      <h2 style="color: #0B8F3C;">Welcome to Our Newsletter!</h2>
      <p>You have successfully subscribed to the Home Rituals newsletter.</p>
      <p>From now on, you'll receive updates, special savings, and first access to our next product collections.</p>
      <p>If you wish to unsubscribe, you can do so at any time by clicking the link in the footer of our newsletter emails.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">&copy; Home Rituals. All rights reserved.</p>
    </div>
  `,

  getOrderCancelledHtml: ({
    orderId,
    customerName,
    cancellationDate,
    cancellationReason,
    items,
    totalAmount,
    paymentMethod,
    refundStatus,
    refundAmount,
    refundId,
  }: {
    orderId: string | number;
    customerName: string;
    cancellationDate: string;
    cancellationReason: string;
    items: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    paymentMethod: string;
    refundStatus: string;
    refundAmount?: number;
    refundId?: string | null;
  }) => {
    const isOnlinePaid = paymentMethod.toLowerCase().includes('razorpay') || refundStatus !== 'NOT_APPLICABLE';
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e8efe7; border-radius: 16px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #f0f4f1; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #111827; font-size: 22px; margin: 0 0 6px 0;">Home Rituals</h1>
          <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
            Order Cancelled
          </span>
        </div>

        <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">
          Hello <strong>${customerName}</strong>,
        </p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Your order <strong>#${orderId}</strong> has been cancelled as requested.
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <h3 style="color: #1f2937; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">Cancellation Details</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563;"><strong>Cancellation Date:</strong> ${cancellationDate}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563;"><strong>Reason:</strong> ${cancellationReason}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563;"><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563;"><strong>Order Total:</strong> ₹${totalAmount.toFixed(2)}</p>
        </div>

        ${
          isOnlinePaid && refundAmount
            ? `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">Refund Information</h3>
            <p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Refund Amount:</strong> ₹${refundAmount.toFixed(2)}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Refund Status:</strong> ${refundStatus}</p>
            ${refundId ? `<p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Refund Reference ID:</strong> <span style="font-family: monospace;">${refundId}</span></p>` : ''}
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #166534; line-height: 1.5;">
              The refund has been initiated to your original payment method. Depending on your bank or payment provider, it typically reflects in your account within 5 to 7 business days.
            </p>
          </div>
        `
            : `
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #4b5563;">
              <strong>Payment Status:</strong> As this order was Cash on Delivery (COD) / unpaid, no payment refund is required.
            </p>
          </div>
        `
        }

        <h3 style="color: #1f2937; font-size: 14px; margin: 0 0 10px 0;">Cancelled Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="text-align: left; padding: 8px 4px; font-size: 12px; color: #6b7280; text-transform: uppercase;">Item</th>
              <th style="text-align: center; padding: 8px 4px; font-size: 12px; color: #6b7280; text-transform: uppercase;">Qty</th>
              <th style="text-align: right; padding: 8px 4px; font-size: 12px; color: #6b7280; text-transform: uppercase;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 4px; font-size: 13px; color: #374151;">${item.name}</td>
                <td style="padding: 10px 4px; font-size: 13px; color: #374151; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px 4px; font-size: 13px; color: #374151; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://homerituals.co/profile" style="background-color: #0B8F3C; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 24px; font-weight: bold; font-size: 14px; display: inline-block;">
            View Your Orders
          </a>
        </div>

        <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 16px 0;">
          If you have any questions regarding your cancellation or refund, please reply directly to this email or reach us at <strong>care@homerituals.com</strong>.
        </p>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
          &copy; ${new Date().getFullYear()} Home Rituals. All rights reserved.
        </p>
      </div>
    `;
  },

  getRefundProcessedHtml: ({
    orderId,
    customerName,
    refundAmount,
    refundId,
    processedDate,
    paymentMethod,
  }: {
    orderId: string | number;
    customerName: string;
    refundAmount: number;
    refundId: string;
    processedDate: string;
    paymentMethod: string;
  }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e8efe7; border-radius: 16px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #f0f4f1; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #111827; font-size: 22px; margin: 0 0 6px 0;">Home Rituals</h1>
        <span style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
          Refund Processed
        </span>
      </div>

      <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">
        Hello <strong>${customerName}</strong>,
      </p>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        We are pleased to inform you that your refund for Order <strong>#${orderId}</strong> has been successfully processed by Razorpay.
      </p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h3 style="color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">Refund Summary</h3>
        <p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Order Number:</strong> #${orderId}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Refund Amount:</strong> ₹${refundAmount.toFixed(2)}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Razorpay Refund ID:</strong> <span style="font-family: monospace;">${refundId}</span></p>
        <p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Processed Date:</strong> ${processedDate}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Payment Method:</strong> ${paymentMethod}</p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
          Your refund has been successfully released by our payment gateway. The amount will be credited back to your original source account according to your bank or card issuer's clearing cycle (usually within 5 to 7 business days).
        </p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://homerituals.co/profile" style="background-color: #0B8F3C; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 24px; font-weight: bold; font-size: 14px; display: inline-block;">
          View Account
        </a>
      </div>

      <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 16px 0;">
        Thank you for choosing Home Rituals. For any support or inquiries, please contact <strong>care@homerituals.com</strong>.
      </p>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
        &copy; ${new Date().getFullYear()} Home Rituals. All rights reserved.
      </p>
    </div>
  `,

  getRefundFailedHtml: ({
    orderId,
    customerName,
    refundAmount,
  }: {
    orderId: string | number;
    customerName: string;
    refundAmount: number;
  }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e8efe7; border-radius: 16px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #f0f4f1; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #111827; font-size: 22px; margin: 0 0 6px 0;">Home Rituals</h1>
        <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
          Refund Notice
        </span>
      </div>

      <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">
        Hello <strong>${customerName}</strong>,
      </p>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your order <strong>#${orderId}</strong> was successfully cancelled. However, we encountered an unexpected delay while processing your automatic refund of <strong>₹${refundAmount.toFixed(2)}</strong> through the payment gateway.
      </p>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h3 style="color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">What Happens Next?</h3>
        <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
          Our finance team has been automatically alerted and will manually process your refund directly to your original payment account. You do not need to take any additional steps.
        </p>
      </div>

      <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 16px 0;">
        If you have questions, please reach out to us at <strong>care@homerituals.com</strong> with your Order ID #${orderId}.
      </p>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
        &copy; ${new Date().getFullYear()} Home Rituals. All rights reserved.
      </p>
    </div>
  `,
};

