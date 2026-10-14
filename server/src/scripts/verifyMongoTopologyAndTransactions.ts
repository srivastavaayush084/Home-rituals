import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('MONGODB TOPOLOGY & TRANSACTION VERIFICATION AUDIT');
  console.log('====================================================\n');

  try {
    // 1. Check Connection & Topology Info via $runCommandRaw
    console.log('[1/4] Probing MongoDB Topology...');
    let helloResult: any = null;
    try {
      helloResult = await prisma.$runCommandRaw({ hello: 1 });
    } catch (e) {
      try {
        helloResult = await prisma.$runCommandRaw({ isMaster: 1 });
      } catch (e2: any) {
        console.error('Failed to run hello/isMaster command:', e2.message);
      }
    }

    if (helloResult) {
      const isReplSet = !!helloResult.setName;
      const isSharded = helloResult.msg === 'isdbgrid';
      const isStandalone = !isReplSet && !isSharded;
      const setName = helloResult.setName || 'None';
      const hosts = helloResult.hosts ? (helloResult.hosts as any[]).length : 0;

      console.log(`  ✓ MongoDB Connected Successfully`);
      console.log(`  • Topology Type: ${isReplSet ? 'Replica Set' : isSharded ? 'Sharded Cluster' : 'Standalone'}`);
      console.log(`  • Replica Set Name: ${setName}`);
      console.log(`  • Replica Member Count: ${hosts}`);
      console.log(`  • Max Wire Version: ${helloResult.maxWireVersion}`);
      console.log(`  • Read Only: ${!!helloResult.readOnly}`);

      if (isStandalone) {
        console.warn('\n  ⚠️ CRITICAL WARNING: Target MongoDB instance is running as a STANDALONE instance without a replica set.');
        console.warn('  MongoDB multi-document transactions STRICTLY require a replica set or sharded cluster.');
      } else {
        console.log('\n  ✓ Replica set is configured. Multi-document transactions are supported by this topology.');
      }
    }

    // 2. Perform Live Forced-Failure Transaction Test
    console.log('\n[2/4] Testing Real MongoDB Multi-Document Transaction & Rollback...');
    
    // Pick an existing product or create a temporary canary product
    let canaryProduct: any = await prisma.product.findFirst();
    let createdCanary = false;

    if (!canaryProduct) {
      // Find a category or create canary
      let category = await prisma.category.findFirst();
      if (!category) {
        category = await prisma.category.create({
          data: { name: 'Audit Test', slug: 'audit-test-' + Date.now() },
        });
      }
      canaryProduct = await prisma.product.create({
        data: {
          name: 'Transaction Canary Product',
          slug: 'canary-product-' + Date.now(),
          sku: 'CANARY-SKU-' + Date.now(),
          description: 'Temporary canary product for transaction verification',
          price: 999,
          stock: 100,
          image: '/test.png',
          concern: 'Test',
          collection: 'Test',
          categoryId: category.id,
        },
      });
      createdCanary = true;
    }

    const originalStock = canaryProduct.stock;
    console.log(`  • Canary Product ID: ${canaryProduct.id}, Baseline Stock: ${originalStock}`);

    try {
      await prisma.$transaction(async (tx) => {
        // Step A: Decrement stock
        await tx.product.update({
          where: { id: canaryProduct.id },
          data: { stock: { decrement: 10 } },
        });

        // Step B: Intentionally throw forced failure
        throw new Error('FORCED_TRANSACTION_ROLLBACK_TEST_INTENTIONAL');
      });
    } catch (txErr: any) {
      if (txErr.message.includes('FORCED_TRANSACTION_ROLLBACK_TEST_INTENTIONAL')) {
        console.log('  ✓ Forced failure triggered successfully inside transaction session');
      } else {
        console.error('  ✗ Unexpected error during transaction test:', txErr.message);
      }
    }

    // Step C: Verify state after abort
    const productAfterRollback = await prisma.product.findUnique({
      where: { id: canaryProduct.id },
      select: { stock: true },
    });

    if (productAfterRollback && productAfterRollback.stock === originalStock) {
      console.log(`  ✓ ROLLBACK CONFIRMED: Stock remains ${productAfterRollback.stock} (expected ${originalStock})`);
    } else {
      console.error(`  ✗ ROLLBACK FAILED! Stock changed to ${productAfterRollback?.stock} despite transaction abort!`);
    }

    // Clean up canary product if created
    if (createdCanary) {
      await prisma.product.delete({ where: { id: canaryProduct.id } });
    }

    // 3. Database Indexes Audit for Order and CheckoutSession
    console.log('\n[3/4] Auditing Existing Data & Indexes for Safe Migration...');
    
    // Check existing indexes on Order
    let orderIndexes: any[] = [];
    try {
      const idxResult: any = await prisma.$runCommandRaw({
        listIndexes: 'Order',
      });
      orderIndexes = idxResult?.cursor?.firstBatch || [];
      console.log(`  • Found ${orderIndexes.length} existing indexes on 'Order' collection:`);
      for (const idx of orderIndexes) {
        console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${!!idx.unique}, sparse: ${!!idx.sparse})`);
      }
    } catch (e: any) {
      console.log('  • Note: Could not list indexes on Order (collection might not exist yet):', e.message);
    }

    // Audit duplicate or null transactionIds / gatewayOrderIds
    const ordersWithTxId = await prisma.order.findMany({
      where: { transactionId: { not: null } },
      select: { id: true, transactionId: true },
    });

    const ordersWithGatewayId = await prisma.order.findMany({
      where: { gatewayOrderId: { not: null } },
      select: { id: true, gatewayOrderId: true },
    });

    const totalOrders = await prisma.order.count();
    const nullTxIdCount = await prisma.order.count({ where: { transactionId: null } });
    const nullGatewayIdCount = await prisma.order.count({ where: { gatewayOrderId: null } });

    console.log(`\n  • Order Records Audit:`);
    console.log(`    - Total Orders: ${totalOrders}`);
    console.log(`    - Orders with transactionId: ${ordersWithTxId.length} (null/missing: ${nullTxIdCount})`);
    console.log(`    - Orders with gatewayOrderId: ${ordersWithGatewayId.length} (null/missing: ${nullGatewayIdCount})`);

    // Check for duplicate transactionIds
    const txIdCounts = new Map<string, number>();
    const dupTxIds: string[] = [];
    for (const o of ordersWithTxId) {
      if (o.transactionId) {
        const count = (txIdCounts.get(o.transactionId) || 0) + 1;
        txIdCounts.set(o.transactionId, count);
        if (count === 2) dupTxIds.push(o.transactionId);
      }
    }

    // Check for duplicate gatewayOrderIds
    const gwIdCounts = new Map<string, number>();
    const dupGwIds: string[] = [];
    for (const o of ordersWithGatewayId) {
      if (o.gatewayOrderId) {
        const count = (gwIdCounts.get(o.gatewayOrderId) || 0) + 1;
        gwIdCounts.set(o.gatewayOrderId, count);
        if (count === 2) dupGwIds.push(o.gatewayOrderId);
      }
    }

    if (dupTxIds.length > 0) {
      console.error(`  ✗ DUPLICATE CONFLICT: Found ${dupTxIds.length} duplicate transactionId values:`, dupTxIds);
    } else {
      console.log(`  ✓ No duplicate transactionId values found among non-null records.`);
    }

    if (dupGwIds.length > 0) {
      console.error(`  ✗ DUPLICATE CONFLICT: Found ${dupGwIds.length} duplicate gatewayOrderId values:`, dupGwIds);
    } else {
      console.log(`  ✓ No duplicate gatewayOrderId values found among non-null records.`);
    }

    // 4. Safe Sparse Index Creation / Verification
    console.log('\n[4/4] Ensuring Safe Sparse Unique Indexes for MongoDB Compatibility...');
    
    // In MongoDB, a non-sparse unique index will reject multiple documents where the field is null!
    // Since pending or legacy orders can have transactionId: null or gatewayOrderId: null,
    // sparse: true or partialFilterExpression is mandatory for MongoDB.
    const ensureSparseIndex = async (collection: string, field: string, indexName: string) => {
      try {
        const res = await prisma.$runCommandRaw({
          createIndexes: collection,
          indexes: [
            {
              key: { [field]: 1 },
              name: indexName,
              unique: true,
              sparse: true,
            },
          ],
        });
        console.log(`  ✓ Sparse unique index ensured for ${collection}.${field} (${indexName}):`, JSON.stringify(res));
      } catch (err: any) {
        console.warn(`  • Index creation note for ${collection}.${field}:`, err.message);
      }
    };

    await ensureSparseIndex('Order', 'transactionId', 'Order_transactionId_sparse_key');
    await ensureSparseIndex('Order', 'gatewayOrderId', 'Order_gatewayOrderId_sparse_key');
    await ensureSparseIndex('CheckoutSession', 'gatewayOrderId', 'CheckoutSession_gatewayOrderId_key');

    console.log('\n====================================================');
    console.log('AUDIT COMPLETE: All checks performed.');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('Audit execution failure:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
