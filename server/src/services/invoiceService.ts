import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { prisma } from '../utils/db';
import { logger } from '../utils/logger';

export interface InvoiceOrderData {
  id: string;
  invoiceNumber?: string | null;
  invoiceDate?: Date | string | null;
  fullName: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string | null;
  phone: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentGateway?: string | null;
  transactionId?: string | null;
  gatewayOrderId?: string | null;
  createdAt: Date | string;
  items: Array<{
    id?: string;
    quantity: number;
    price: number;
    product?: {
      id?: string;
      name?: string;
      image?: string;
    } | null;
    name?: string;
  }>;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

/**
 * Converts a positive number to English words for INR currency display.
 */
export function numberToWordsINR(amount: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertSection(num: number): string {
    let str = '';
    if (num >= 100) {
      str += units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      str += units[num] + ' ';
    }
    return str.trim();
  }

  const rounded = Math.round(amount);
  if (rounded === 0) return 'Rupees Zero Only';

  let remaining = rounded;
  let words = '';

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    words += convertSection(crore) + ' Crore ';
  }

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    words += convertSection(lakh) + ' Lakh ';
  }

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    words += convertSection(thousand) + ' Thousand ';
  }

  const hundred = Math.floor(remaining / 100);
  remaining %= 100;
  if (hundred > 0) {
    words += units[hundred] + ' Hundred ';
  }

  if (remaining > 0) {
    if (words !== '') words += 'and ';
    words += convertSection(remaining) + ' ';
  }

  return `Rupees ${words.trim()} Only`;
}

/**
 * Generates the next sequential unique invoice number in format HR-INV-YYYY-XXXXX
 */
export async function generateInvoiceNumber(tx?: any): Promise<string> {
  const client = tx || prisma;
  const currentYear = new Date().getFullYear();
  const prefix = `HR-INV-${currentYear}-`;

  const count = await client.order.count({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
  });

  let nextSeq = count + 1;
  let candidate = `${prefix}${nextSeq.toString().padStart(5, '0')}`;

  let existing = await client.order.findUnique({
    where: { invoiceNumber: candidate },
    select: { id: true },
  });

  let attempts = 0;
  while (existing && attempts < 20) {
    attempts++;
    nextSeq++;
    candidate = `${prefix}${nextSeq.toString().padStart(5, '0')}`;
    existing = await client.order.findUnique({
      where: { invoiceNumber: candidate },
      select: { id: true },
    });
  }

  return candidate;
}

/**
 * Generates a branded, pixel-perfect A4 PDF Invoice buffer using PDFKit.
 */
export async function generateInvoicePDFBuffer(order: InvoiceOrderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 inch margins
        info: {
          Title: `Invoice ${order.invoiceNumber || order.id}`,
          Author: 'Home Rituals',
          Subject: `Tax Invoice for Order #${order.id}`,
          Keywords: 'Home Rituals, Invoice, Tax Invoice, Order Receipt',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#1c2c22'; // Deep forest luxury green
      const brandGreen = '#0B8F3C';   // Botanical vibrant green
      const goldAccent = '#C5A059';   // Muted gold
      const textDark = '#1f2937';     // Dark neutral
      const textMuted = '#6b7280';    // Muted grey
      const bgLight = '#f8faf9';      // Very subtle tinted white
      const borderColor = '#e5e7eb';  // Clean border

      const pageWidth = 595.28;
      const leftMargin = 36;
      const rightMargin = 36;
      const contentWidth = pageWidth - leftMargin - rightMargin; // 523.28

      // ==========================================
      // 1. BRAND TOP HEADER
      // ==========================================
      // Decorative top accent bar
      doc.rect(0, 0, pageWidth, 5).fill(brandGreen);

      // Check if official logo image exists
      const logoPath = path.resolve(__dirname, '../assets/logo.jpg');
      let logoDrawn = false;
      const startY = 24;

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, leftMargin, startY, { width: 55, height: 55 });
          logoDrawn = true;
        } catch (imgErr) {
          logger.warn('Failed to embed logo image into invoice PDF:', imgErr);
        }
      }

      const textStartX = logoDrawn ? leftMargin + 65 : leftMargin;

      // Brand Title & Tagline
      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('HOME RITUALS', textStartX, startY + 4);

      doc.fillColor(brandGreen)
        .font('Helvetica-Oblique')
        .fontSize(8.5)
        .text('Beloved essentials for everyday rituals', textStartX, startY + 23);

      doc.fillColor(textMuted)
        .font('Helvetica')
        .fontSize(7.5)
        .text('Office No. 321, Swagat Business Hub, Hazira Rd, Surat, Gujarat - 394510', textStartX, startY + 36)
        .text('Email: info@homerituals.co  |  Phone: +91 8490969922  |  Web: homerituals.co', textStartX, startY + 47);

      // Top Right: TAX INVOICE Title Badge
      const rightColX = leftMargin + contentWidth - 190;
      doc.rect(rightColX, startY, 190, 62)
        .fillAndStroke(bgLight, borderColor);

      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('TAX INVOICE', rightColX + 12, startY + 8, { width: 166, align: 'right' });

      const invNo = order.invoiceNumber || `HR-INV-${new Date().getFullYear()}-${order.id.slice(-6).toUpperCase()}`;
      const invDate = order.invoiceDate
        ? new Date(order.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      doc.fillColor(textDark)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('Invoice No: ', rightColX + 12, startY + 28, { continued: true })
        .font('Helvetica')
        .text(invNo);

      doc.font('Helvetica-Bold')
        .text('Invoice Date: ', rightColX + 12, startY + 41, { continued: true })
        .font('Helvetica')
        .text(invDate);

      // ==========================================
      // 2. METADATA SECTION (BILL TO & ORDER INFO)
      // ==========================================
      const metaY = 100;
      const boxWidth = (contentWidth - 12) / 2;
      const boxHeight = 105;

      // Left Box: Bill To / Ship To
      doc.roundedRect(leftMargin, metaY, boxWidth, boxHeight, 4)
        .fillAndStroke('#ffffff', borderColor);

      // Left Box Header
      doc.rect(leftMargin, metaY, boxWidth, 20)
        .fill(bgLight);
      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('CUSTOMER / SHIPPING DETAILS', leftMargin + 10, metaY + 6);

      // Customer Data
      doc.fillColor(textDark)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(order.fullName || 'Valued Customer', leftMargin + 10, metaY + 26);

      doc.font('Helvetica')
        .fontSize(8)
        .fillColor(textDark)
        .text(order.address1 || '', leftMargin + 10, metaY + 38);

      if (order.address2) {
        doc.text(order.address2, leftMargin + 10, metaY + 49);
      }

      const landmarkText = order.landmark ? `Landmark: ${order.landmark}, ` : '';
      doc.text(
        `${landmarkText}${order.city || ''}, ${order.state || ''} - ${order.postalCode || ''}`,
        leftMargin + 10,
        order.address2 ? metaY + 60 : metaY + 49
      );

      doc.text(`${order.country || 'India'}`, leftMargin + 10, order.address2 ? metaY + 71 : metaY + 60);

      const contactY = order.address2 ? metaY + 83 : metaY + 73;
      doc.font('Helvetica-Bold')
        .fontSize(7.5)
        .text('Phone: ', leftMargin + 10, contactY, { continued: true })
        .font('Helvetica')
        .text(order.phone || 'N/A', { continued: true })
        .font('Helvetica-Bold')
        .text(order.user?.email ? '   |   Email: ' : '', { continued: true })
        .font('Helvetica')
        .text(order.user?.email || '');

      // Right Box: Order & Payment Info
      const rightBoxX = leftMargin + boxWidth + 12;
      doc.roundedRect(rightBoxX, metaY, boxWidth, boxHeight, 4)
        .fillAndStroke('#ffffff', borderColor);

      // Right Box Header
      doc.rect(rightBoxX, metaY, boxWidth, 20)
        .fill(bgLight);
      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('PAYMENT & ORDER SUMMARY', rightBoxX + 10, metaY + 6);

      // Order Details
      let rY = metaY + 26;
      const orderDateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark)
        .text('Order ID:', rightBoxX + 10, rY)
        .font('Helvetica')
        .text(`#${order.id}`, rightBoxX + 85, rY);

      rY += 14;
      doc.font('Helvetica-Bold')
        .text('Order Date:', rightBoxX + 10, rY)
        .font('Helvetica')
        .text(orderDateStr, rightBoxX + 85, rY);

      rY += 14;
      doc.font('Helvetica-Bold')
        .text('Payment Gateway:', rightBoxX + 10, rY)
        .font('Helvetica')
        .text(order.paymentGateway || 'Razorpay', rightBoxX + 85, rY);

      rY += 14;
      doc.font('Helvetica-Bold')
        .text('Payment Status:', rightBoxX + 10, rY)
        .font('Helvetica-Bold')
        .fillColor(brandGreen)
        .text((order.paymentStatus || 'PAID').toUpperCase(), rightBoxX + 85, rY);

      rY += 14;
      if (order.transactionId) {
        doc.font('Helvetica-Bold').fillColor(textDark)
          .text('Transaction ID:', rightBoxX + 10, rY)
          .font('Helvetica')
          .text(order.transactionId, rightBoxX + 85, rY, { width: boxWidth - 95 });
      }

      // ==========================================
      // 3. ITEM DETAILS TABLE
      // ==========================================
      const tableY = 220;
      const tableHeaderHeight = 22;

      // Table Header Background
      doc.rect(leftMargin, tableY, contentWidth, tableHeaderHeight)
        .fill(primaryColor);

      // Table Header Titles
      doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(8);

      const colSnWidth = 30;
      const colQtyWidth = 45;
      const colPriceWidth = 75;
      const colTotalWidth = 85;
      const colDescWidth = contentWidth - (colSnWidth + colQtyWidth + colPriceWidth + colTotalWidth);

      const xSn = leftMargin;
      const xDesc = xSn + colSnWidth;
      const xQty = xDesc + colDescWidth;
      const xPrice = xQty + colQtyWidth;
      const xTotal = xPrice + colPriceWidth;

      doc.text('#', xSn + 6, tableY + 7);
      doc.text('ITEM DESCRIPTION', xDesc + 6, tableY + 7);
      doc.text('QTY', xQty, tableY + 7, { width: colQtyWidth - 6, align: 'center' });
      doc.text('PRICE (INR)', xPrice, tableY + 7, { width: colPriceWidth - 8, align: 'right' });
      doc.text('TOTAL (INR)', xTotal, tableY + 7, { width: colTotalWidth - 10, align: 'right' });

      // Table Rows
      let currentY = tableY + tableHeaderHeight;
      const items = order.items || [];
      let calculatedSubtotal = 0;

      items.forEach((item, index) => {
        const rowHeight = 26;
        const isEven = index % 2 === 0;

        // Row background
        if (!isEven) {
          doc.rect(leftMargin, currentY, contentWidth, rowHeight).fill('#fafafa');
        }

        // Bottom border
        doc.rect(leftMargin, currentY + rowHeight - 0.5, contentWidth, 0.5).fill('#eeeeee');

        const itemName = item.product?.name || item.name || 'Home Rituals Product';
        const itemQty = item.quantity || 1;
        const itemPrice = item.price || 0;
        const itemTotal = itemQty * itemPrice;
        calculatedSubtotal += itemTotal;

        // Cell contents
        doc.fillColor(textDark)
          .font('Helvetica')
          .fontSize(8)
          .text((index + 1).toString(), xSn + 6, currentY + 8);

        doc.font('Helvetica-Bold')
          .text(itemName, xDesc + 6, currentY + 8, { width: colDescWidth - 12, ellipsis: true });

        doc.font('Helvetica')
          .text(itemQty.toString(), xQty, currentY + 8, { width: colQtyWidth - 6, align: 'center' });

        doc.text(
          `Rs. ${itemPrice.toFixed(2)}`,
          xPrice,
          currentY + 8,
          { width: colPriceWidth - 8, align: 'right' }
        );

        doc.font('Helvetica-Bold')
          .text(
            `Rs. ${itemTotal.toFixed(2)}`,
            xTotal,
            currentY + 8,
            { width: colTotalWidth - 10, align: 'right' }
          );

        currentY += rowHeight;
      });

      // Outer border around items table
      doc.rect(leftMargin, tableY, contentWidth, currentY - tableY)
        .stroke(borderColor);

      // ==========================================
      // 4. SUMMARY & TOTALS SECTION
      // ==========================================
      currentY += 12;
      const summaryBoxWidth = 230;
      const summaryBoxX = leftMargin + contentWidth - summaryBoxWidth;

      // Left Box: Amount in Words & Notes
      const notesWidth = contentWidth - summaryBoxWidth - 16;
      doc.roundedRect(leftMargin, currentY, notesWidth, 90, 4)
        .fillAndStroke(bgLight, borderColor);

      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text('AMOUNT IN WORDS:', leftMargin + 10, currentY + 8);

      const finalTotal = order.totalAmount || calculatedSubtotal;
      doc.fillColor(textDark)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(numberToWordsINR(finalTotal), leftMargin + 10, currentY + 20, { width: notesWidth - 20 });

      doc.fillColor(textMuted)
        .font('Helvetica')
        .fontSize(7)
        .text('Notes / Terms:', leftMargin + 10, currentY + 45)
        .text('• All prices include applicable Goods and Services Tax (GST).', leftMargin + 10, currentY + 56)
        .text('• This electronic invoice is valid without signature as per IT Act 2000.', leftMargin + 10, currentY + 67)
        .text('• For customer support, visit https://homerituals.co or write to info@homerituals.co.', leftMargin + 10, currentY + 78);

      // Right Box: Totals Breakdown Card
      doc.roundedRect(summaryBoxX, currentY, summaryBoxWidth, 90, 4)
        .fillAndStroke('#ffffff', borderColor);

      let sY = currentY + 8;
      doc.font('Helvetica').fontSize(8).fillColor(textDark)
        .text('Subtotal:', summaryBoxX + 12, sY)
        .text(`Rs. ${calculatedSubtotal.toFixed(2)}`, summaryBoxX + 12, sY, { width: summaryBoxWidth - 24, align: 'right' });

      sY += 15;
      doc.text('Shipping & Delivery:', summaryBoxX + 12, sY)
        .fillColor(brandGreen)
        .text('FREE', summaryBoxX + 12, sY, { width: summaryBoxWidth - 24, align: 'right' })
        .fillColor(textDark);

      sY += 15;
      // Tax inclusion note
      const estTax = (finalTotal * 0.18) / 1.18; // 18% GST component included in total
      doc.fontSize(7.5).fillColor(textMuted)
        .text('Taxes (GST 18% Incl.):', summaryBoxX + 12, sY)
        .text(`(Rs. ${estTax.toFixed(2)})`, summaryBoxX + 12, sY, { width: summaryBoxWidth - 24, align: 'right' });

      sY += 15;
      // Divider
      doc.rect(summaryBoxX + 10, sY, summaryBoxWidth - 20, 0.75).fill(borderColor);

      sY += 7;
      // Final Total Highlight
      doc.rect(summaryBoxX + 4, sY, summaryBoxWidth - 8, 22)
        .fill(primaryColor);

      doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text('TOTAL PAID:', summaryBoxX + 12, sY + 6)
        .text(`Rs. ${finalTotal.toFixed(2)}`, summaryBoxX + 12, sY + 6, { width: summaryBoxWidth - 24, align: 'right' });

      // ==========================================
      // 5. SIGN-OFF & BRAND FOOTER
      // ==========================================
      const footerY = 740;

      // Decorative divider
      doc.rect(leftMargin, footerY, contentWidth, 0.75).fill(goldAccent);

      // Thank You Message
      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Thank you for welcoming Home Rituals into your home.', leftMargin, footerY + 8, {
          width: contentWidth,
          align: 'center',
        });

      doc.fillColor(textMuted)
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          'For return requests, product care instructions, or queries, please email info@homerituals.co or call +91 8490969922.',
          leftMargin,
          footerY + 22,
          { width: contentWidth, align: 'center' }
        );

      // Bottom bar
      doc.rect(0, 836.89, pageWidth, 5).fill(brandGreen);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
