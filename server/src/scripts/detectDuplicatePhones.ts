import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=====================================================');
  console.log('🔍 Duplicate Phone Number Detection & Audit Script');
  console.log('=====================================================\n');

  try {
    const users = await prisma.user.findMany({
      where: {
        phone: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    console.log(`Auditing ${users.length} user accounts with phone numbers registered...\n`);

    const phoneMap = new Map<string, typeof users>();

    for (const user of users) {
      if (!user.phone) continue;
      const normalized = user.phone.trim();
      if (!normalized) continue;

      const list = phoneMap.get(normalized) || [];
      list.push(user);
      phoneMap.set(normalized, list);
    }

    const duplicates: Array<{ phone: string; users: typeof users }> = [];
    for (const [phone, list] of phoneMap.entries()) {
      if (list.length > 1) {
        duplicates.push({ phone, users: list });
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ ZERO DUPLICATES FOUND.');
      console.log('The User.phone field is completely clean across all registered accounts.');
      console.log('It is safe to apply the unique index to MongoDB / Prisma schema.\n');
    } else {
      console.warn(`⚠️ FOUND ${duplicates.length} DUPLICATE PHONE NUMBER(S):\n`);
      for (const dup of duplicates) {
        console.log(`📱 Phone: "${dup.phone}" (Shared by ${dup.users.length} accounts):`);
        for (const u of dup.users) {
          console.log(`   - ID: ${u.id} | Name: ${u.name} | Email: ${u.email || 'N/A'} | Created: ${u.createdAt.toISOString()}`);
        }
        console.log('');
      }

      console.log('📋 Resolution Steps before applying Prisma DB push / index creation:');
      console.log('1. Contact or review accounts sharing identical phone numbers.');
      console.log('2. Manually nullify or correct redundant phone numbers for older/inactive duplicate accounts:');
      console.log('   db.User.updateOne({ _id: ObjectId("<older_user_id>") }, { $unset: { phone: "" } });');
      console.log('3. Re-run this detection script: npx ts-node src/scripts/detectDuplicatePhones.ts');
      console.log('4. Once 0 duplicates remain, apply schema synchronization: npx prisma db push --skip-generate');
    }
  } catch (error) {
    console.error('❌ Error executing duplicate phone detection audit:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
