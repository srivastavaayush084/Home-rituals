import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting index configuration repair...');
  try {
    // 1. Drop existing User_email_key index
    try {
      await prisma.$runCommandRaw({
        dropIndexes: 'User',
        index: 'User_email_key',
      });
      console.log('Successfully dropped old User_email_key index.');
    } catch (e) {
      console.log('User_email_key index did not exist or was already dropped.');
    }

    // 2. Re-create sparse unique index for email
    const result = await prisma.$runCommandRaw({
      createIndexes: 'User',
      indexes: [
        {
          key: { email: 1 },
          name: 'User_email_key',
          unique: true,
          sparse: true,
        },
      ],
    });
    console.log('Successfully created sparse unique index for email:', result);
    console.log('Index configuration repair completed successfully!');
  } catch (err) {
    console.error('Error repairing indexes:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
