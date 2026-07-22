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

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }): Promise<void> {
  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      logger.info(`Email successfully sent to ${to}: "${subject}"`);
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
        <a href="http://localhost:5173/shop" style="background-color: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold;">Start Shopping</a>
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

  getPaymentSuccessHtml: (orderId: string | number, paymentId: string, amount: number) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
      <h2 style="color: #0B8F3C;">Payment Successful</h2>
      <p>Your payment of <strong>₹${amount}</strong> for Order <strong>#${orderId}</strong> has been successfully processed.</p>
      <p><strong>Razorpay Payment ID:</strong> ${paymentId}</p>
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
};
