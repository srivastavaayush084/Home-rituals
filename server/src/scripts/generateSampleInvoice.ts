import fs from 'fs';
import path from 'path';
import { generateInvoicePDFBuffer } from '../services/invoiceService';

async function main() {
  const sampleOrder = {
    id: 'ORD-65F9A81B02',
    invoiceNumber: 'HR-INV-2026-00042',
    invoiceDate: new Date('2026-09-30T10:30:00Z'),
    fullName: 'Ayush Srivastava',
    address1: 'Flat 402, Green Valley Luxury Enclave',
    address2: 'Vip Road, Vesu',
    city: 'Surat',
    state: 'Gujarat',
    postalCode: '395007',
    country: 'India',
    landmark: 'Opposite Central Park',
    phone: '+91 8490969922',
    totalAmount: 998,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    paymentGateway: 'Razorpay',
    transactionId: 'pay_P1q8zLive9942a',
    gatewayOrderId: 'order_P1q8zLive9942a',
    createdAt: new Date('2026-09-30T10:28:15Z'),
    items: [
      {
        quantity: 2,
        price: 499,
        product: {
          name: 'Home Rituals Washing Machine Cleaner (Pack of 2)',
        },
      },
    ],
    user: {
      email: 'ayush@homerituals.co',
      name: 'Ayush Srivastava',
    },
  };

  const buffer = await generateInvoicePDFBuffer(sampleOrder);

  // 1. Root of the project workspace
  const rootDest = path.resolve(__dirname, '../../../HomeRituals-Sample-Invoice.pdf');
  fs.writeFileSync(rootDest, buffer);

  // 2. Artifact directory
  const artifactDir = 'C:/Users/ayush/.gemini/antigravity-ide/brain/ac6c5732-c42a-4873-abd1-fe84fcbd0bfc';
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(path.join(artifactDir, 'HomeRituals-Sample-Invoice.pdf'), buffer);
  }

  console.log('Sample PDF created at:', rootDest);
}

main().catch((err) => {
  console.error('Error generating sample PDF:', err);
  process.exit(1);
});
