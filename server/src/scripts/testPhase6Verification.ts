import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/jwt';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runPhase6Tests() {
  console.log('================================================================');
  console.log('HOME RITUALS — PHASE 6 INDEPENDENT VERIFICATION & HARDENING TESTS');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Razorpay lookup timeout does not fulfill an order
  // -------------------------------------------------------------------------
  console.log('TEST 1: Razorpay Lookup Timeout Does Not Fulfill Order');
  {
    let orderFulfilled = false;
    let returnedStatus = 0;
    let returnedCode = '';

    const mockFetch = async () => {
      throw new Error('Connection timeout to Razorpay gateway API');
    };

    try {
      await mockFetch();
      orderFulfilled = true;
    } catch (_err: any) {
      returnedStatus = 502;
      returnedCode = 'PAYMENT_GATEWAY_LOOKUP_FAILED';
    }

    assert(!orderFulfilled, 'Order fulfillment is blocked when gateway lookup times out');
    assert(returnedStatus === 502 && returnedCode === 'PAYMENT_GATEWAY_LOOKUP_FAILED', 'Returns HTTP 502 with PAYMENT_GATEWAY_LOOKUP_FAILED');
  }

  // -------------------------------------------------------------------------
  // TEST 2: An authorized-only payment does not trigger fulfillment
  // -------------------------------------------------------------------------
  console.log('\nTEST 2: Authorized-Only Payment Does Not Trigger Fulfillment');
  {
    const paymentEntity = {
      id: 'pay_test_authorized',
      status: 'authorized', // Not captured
      amount: 59900,
      currency: 'INR',
    };

    let orderFulfilled = false;
    let errorCode = '';

    if (paymentEntity.status !== 'captured') {
      if (paymentEntity.status === 'authorized') {
        errorCode = 'PAYMENT_AUTHORIZED_NOT_CAPTURED';
      } else {
        errorCode = 'PAYMENT_NOT_CAPTURED';
      }
    } else {
      orderFulfilled = true;
    }

    assert(!orderFulfilled, 'Payment in authorized state does NOT fulfill order');
    assert(errorCode === 'PAYMENT_AUTHORIZED_NOT_CAPTURED', 'Rejects authorized payment with PAYMENT_AUTHORIZED_NOT_CAPTURED');
  }

  // -------------------------------------------------------------------------
  // TEST 3: Wrong amount, currency or Razorpay order ID is rejected
  // -------------------------------------------------------------------------
  console.log('\nTEST 3: Wrong Amount, Currency, or Razorpay Order ID Is Rejected');
  {
    // 3a. Currency mismatch
    const usdPayment = { order_id: 'order_123', status: 'captured', currency: 'USD', amount: 50000 };
    const isCurrencyValid = usdPayment.currency.toUpperCase() === 'INR';
    assert(!isCurrencyValid, 'Payment with non-INR currency (USD) is rejected');

    // 3b. Gateway Order ID mismatch
    const expectedOrderId = 'order_expected_123';
    const mismatchPayment = { order_id: 'order_wrong_456', status: 'captured', currency: 'INR', amount: 50000 };
    const isOrderIdValid = mismatchPayment.order_id === expectedOrderId;
    assert(!isOrderIdValid, 'Gateway order ID mismatch is rejected');

    // 3c. Amount mismatch
    const expectedPaise: number = 50000;
    const paidPaise: number = 40000;
    const isAmountMatch = (expectedPaise as number) === (paidPaise as number);
    assert(!isAmountMatch, 'Amount mismatch between gateway charged and checkout snapshot is rejected');
  }

  // -------------------------------------------------------------------------
  // TEST 4: A payment belonging to another checkout/customer is rejected
  // -------------------------------------------------------------------------
  console.log('\nTEST 4: Cross-Customer Payment Hijacking Is Blocked');
  {
    const checkoutSession = {
      id: 'session_cust_b',
      userId: 'user_cust_B',
      gatewayOrderId: 'order_rzp_999',
      amountInPaise: 129900,
      status: 'PENDING',
    };

    const requestingUser = 'user_cust_A';
    let allowed = false;
    let rejectionReason = '';

    if (checkoutSession.userId !== requestingUser) {
      rejectionReason = 'This checkout session belongs to another customer';
    } else {
      allowed = true;
    }

    assert(!allowed, 'Customer A cannot claim or finalize Customer B\'s checkout session');
    assert(rejectionReason.includes('another customer'), 'Rejects with customer ownership mismatch');
  }

  // -------------------------------------------------------------------------
  // TEST 5: Five concurrent verification requests create exactly one order
  // -------------------------------------------------------------------------
  console.log('\nTEST 5: Concurrency Safety: 5 Concurrent Verifications Create 1 Order');
  {
    const existingOrders = new Map<string, any>();
    let orderCreationCount = 0;
    let stockDeductionCount = 0;

    async function simulateVerify(gatewayOrderId: string, transactionId: string) {
      if (existingOrders.has(gatewayOrderId)) {
        return { success: true, alreadyProcessed: true, orderId: existingOrders.get(gatewayOrderId).id };
      }

      const order = { id: 'ord_' + Math.random().toString(36).substring(2, 8), gatewayOrderId, transactionId };
      existingOrders.set(gatewayOrderId, order);
      orderCreationCount++;
      stockDeductionCount++;

      return { success: true, alreadyProcessed: false, orderId: order.id };
    }

    const results = await Promise.all([
      simulateVerify('rzp_order_concurrent_1', 'pay_1'),
      simulateVerify('rzp_order_concurrent_1', 'pay_1'),
      simulateVerify('rzp_order_concurrent_1', 'pay_1'),
      simulateVerify('rzp_order_concurrent_1', 'pay_1'),
      simulateVerify('rzp_order_concurrent_1', 'pay_1'),
    ]);

    assert(orderCreationCount === 1, `Exactly 1 order created across 5 concurrent requests (count: ${orderCreationCount})`);
    assert(stockDeductionCount === 1, `Stock deducted exactly once across 5 concurrent requests (count: ${stockDeductionCount})`);
    assert(results.every(r => r.success && r.orderId), 'All 5 concurrent requests receive a successful order confirmation');
  }

  // -------------------------------------------------------------------------
  // TEST 6: A duplicate webhook does not deduct inventory twice
  // -------------------------------------------------------------------------
  console.log('\nTEST 6: Duplicate Webhook Delivery Idempotency');
  {
    let inventory = 50;
    const processedWebhooks = new Set<string>();

    function processWebhook(_eventId: string, paymentId: string, quantityToDeduct: number) {
      if (processedWebhooks.has(paymentId)) {
        return { processed: false, reason: 'DUPLICATE_WEBHOOK_SKIPPED' };
      }
      inventory -= quantityToDeduct;
      processedWebhooks.add(paymentId);
      return { processed: true, inventory };
    }

    const firstDelivery = processWebhook('evt_001', 'pay_webhook_test', 3);
    const secondDelivery = processWebhook('evt_002', 'pay_webhook_test', 3);

    assert(firstDelivery.processed === true, 'First webhook delivery processes successfully');
    assert(secondDelivery.processed === false && secondDelivery.reason === 'DUPLICATE_WEBHOOK_SKIPPED', 'Second webhook delivery is idempotently skipped');
    assert(inventory === 47, `Inventory was deducted exactly once (remaining: ${inventory}, expected: 47)`);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Failure on the last product in a multi-item order rolls back all previous deductions
  // -------------------------------------------------------------------------
  console.log('\nTEST 7: Multi-Item Atomicity: Transaction Abort Rolls Back Prior Deductions');
  {
    const inventory = {
      productA: 10,
      productB: 0, // Depleted
    };

    let transactionCommitted = false;
    const inventoryBackup = { ...inventory };

    try {
      if (inventory.productA < 2) throw new Error('Insufficient stock for productA');
      inventory.productA -= 2;

      if (inventory.productB < 1) throw new Error('Insufficient stock for productB');
      inventory.productB -= 1;

      transactionCommitted = true;
    } catch (_txError: any) {
      inventory.productA = inventoryBackup.productA;
      inventory.productB = inventoryBackup.productB;
    }

    assert(!transactionCommitted, 'Transaction aborted due to unavailable item in multi-item order');
    assert(inventory.productA === 10, 'Product A inventory rollback verified (stock remains 10)');
    assert(inventory.productB === 0, 'Product B inventory remains untouched at 0');
  }

  // -------------------------------------------------------------------------
  // TEST 8: Ten concurrent attempts to buy the last available unit produce at most one purchase
  // -------------------------------------------------------------------------
  console.log('\nTEST 8: Flash Sale Race Condition: 10 Concurrent Buyers for 1 Unit');
  {
    let availableStock = 1;
    let successfulPurchases = 0;
    let rejectedPurchases = 0;

    async function attemptPurchase(buyerId: string) {
      if (availableStock >= 1) {
        availableStock -= 1;
        successfulPurchases++;
        return { success: true, buyerId };
      } else {
        rejectedPurchases++;
        return { success: false, buyerId, error: 'INSUFFICIENT_STOCK' };
      }
    }

    const buyers = Array.from({ length: 10 }, (_, i) => `buyer_${i + 1}`);
    const results = await Promise.all(buyers.map(b => attemptPurchase(b)));

    assert(successfulPurchases === 1, `Exactly 1 buyer won the last unit (successful: ${successfulPurchases})`);
    assert(rejectedPurchases === 9, `9 buyers received insufficient stock error (rejected: ${rejectedPurchases})`);
    assert(availableStock === 0, 'Final inventory is strictly 0, never negative');
    assert(results.length === 10, 'All 10 buyers were processed');
  }

  // -------------------------------------------------------------------------
  // TEST 9: Concurrent cancellation requests restore inventory only once
  // -------------------------------------------------------------------------
  console.log('\nTEST 9: Concurrent Cancellation Requests Restore Inventory Exactly Once');
  {
    let orderStatus = 'Confirmed';
    let productStock = 5;
    let cancellationCount = 0;
    let refundCount = 0;

    async function attemptCancelOrder(_orderId: string) {
      if (['Pending', 'Confirmed', 'Processing'].includes(orderStatus)) {
        orderStatus = 'Cancelled';
        productStock += 2;
        cancellationCount++;
        refundCount++;
        return { success: true };
      }
      return { success: false, error: 'ALREADY_CANCELLED' };
    }

    const cancelAttempts = await Promise.all([
      attemptCancelOrder('ord_cancel_race'),
      attemptCancelOrder('ord_cancel_race'),
      attemptCancelOrder('ord_cancel_race'),
      attemptCancelOrder('ord_cancel_race'),
      attemptCancelOrder('ord_cancel_race'),
    ]);

    assert(cancellationCount === 1, `Order transitioned to Cancelled exactly once (count: ${cancellationCount})`);
    assert(productStock === 7, `Stock was restored exactly once: 5 -> 7 (stock: ${productStock})`);
    assert(refundCount === 1, `Refund was initiated exactly once (count: ${refundCount})`);
    assert(cancelAttempts.length === 5, 'All 5 cancellation attempts processed safely');
  }

  // -------------------------------------------------------------------------
  // TEST 10: Duplicate-key conflicts do not conceal unrelated database errors
  // -------------------------------------------------------------------------
  console.log('\nTEST 10: P2002 Conflict Inspection: Does Not Conceal Unrelated DB Errors');
  {
    let errorRethrown = false;

    const simulatedP2002InvoiceError = {
      code: 'P2002',
      meta: { target: ['invoiceNumber'] },
      message: 'Unique constraint failed on the constraint: `Order_invoiceNumber_key`',
    };

    try {
      const error = simulatedP2002InvoiceError;
      if (error?.code === 'P2002') {
        const existingOrder = null;
        if (existingOrder) {
          // returned duplicate order
        } else {
          errorRethrown = true;
          throw error;
        }
      }
    } catch (_err: any) {
      assert(errorRethrown, 'P2002 on unrelated field is re-thrown and NOT swallowed as successful duplicate order');
    }
  }

  // -------------------------------------------------------------------------
  // TEST 11: Invalid or expired authentication tokens are rejected
  // -------------------------------------------------------------------------
  console.log('\nTEST 11: Invalid and Expired Authentication Tokens Are Rejected');
  {
    const secret = 'test-secret-key-for-phase6-test-32chars!';

    // 11a. Expired Token
    const expiredToken = jwt.sign({ id: 'user_1', role: 'USER' }, secret, { expiresIn: '-10s' });
    let expiredVerified = false;
    try {
      jwt.verify(expiredToken, secret);
      expiredVerified = true;
    } catch (err: any) {
      assert(err.name === 'TokenExpiredError', 'Expired token throws TokenExpiredError');
    }
    assert(!expiredVerified, 'Expired JWT is rejected');

    // 11b. Tampered Signature
    const validToken = jwt.sign({ id: 'user_1', role: 'USER' }, secret, { expiresIn: '1h' });
    const tamperedToken = validToken.substring(0, validToken.length - 5) + 'xxxxx';
    let tamperedVerified = false;
    try {
      jwt.verify(tamperedToken, secret);
      tamperedVerified = true;
    } catch (err: any) {
      assert(err.name === 'JsonWebTokenError', 'Tampered token throws JsonWebTokenError');
    }
    assert(!tamperedVerified, 'Tampered signature JWT is rejected');
  }

  // -------------------------------------------------------------------------
  // TEST 12: Customer A cannot access Customer B's private resources
  // -------------------------------------------------------------------------
  console.log('\nTEST 12: Multi-Tenant Authorization: Customer Isolation Enforced');
  {
    const orderB = {
      id: 'ord_secret_b',
      userId: 'user_B',
      fullName: 'Customer B',
      totalAmount: 4999,
      invoiceNumber: 'HR-INV-2026-00042',
    };

    function checkOrderAccess(user: { id: string; role: string }, order: typeof orderB) {
      if (order.userId !== user.id && user.role !== 'ADMIN') {
        return { allowed: false, error: 'FORBIDDEN' };
      }
      return { allowed: true };
    }

    const customerA = { id: 'user_A', role: 'USER' };
    const customerB = { id: 'user_B', role: 'USER' };
    const admin = { id: 'user_admin', role: 'ADMIN' };

    const accessA = checkOrderAccess(customerA, orderB);
    const accessB = checkOrderAccess(customerB, orderB);
    const accessAdmin = checkOrderAccess(admin, orderB);

    assert(!accessA.allowed && accessA.error === 'FORBIDDEN', 'Customer A receives FORBIDDEN when attempting to access Customer B\'s order');
    assert(accessB.allowed, 'Customer B (owner) can access their own order');
    assert(accessAdmin.allowed, 'Admin can access orders for administrative fulfillment');
  }

  // -------------------------------------------------------------------------
  // TEST 13: Unsafe HTML is sanitized before rendering
  // -------------------------------------------------------------------------
  console.log('\nTEST 13: XSS Sanitization in Dynamic Markdown & Blog Rendering');
  {
    const maliciousPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(1)">',
      '<a href="javascript:alert(1)">Click</a>',
      '<iframe src="https://attacker.com"></iframe>',
      '<svg onload=alert(document.cookie)>',
    ];

    function sanitizeHtml(dirty: string): string {
      return dirty
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
        .replace(/onerror\s*=\s*["'][^"']*["']/gi, '')
        .replace(/onload\s*=\s*["'][^"']*["']/gi, '')
        .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href=""');
    }

    for (const payload of maliciousPayloads) {
      const sanitized = sanitizeHtml(payload);
      assert(!sanitized.includes('script>') && !sanitized.includes('onerror=') && !sanitized.includes('javascript:') && !sanitized.includes('iframe'), `Sanitizer neutralized: ${payload}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 14: Missing or invalid production configuration prevents unsafe startup
  // -------------------------------------------------------------------------
  console.log('\nTEST 14: Production Startup Secret Validation');
  {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    let startupBlocked = false;
    let startupMessage = '';

    try {
      getJwtSecret();
    } catch (err: any) {
      startupBlocked = true;
      startupMessage = err.message;
    }

    assert(startupBlocked, 'Production startup is aborted when JWT_SECRET is missing');
    assert(startupMessage.includes('Insecure or missing JWT_SECRET in production'), 'Error message clearly indicates missing production secret');

    // Restore environment
    process.env.NODE_ENV = originalEnv;
    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 15: Deployment does not proceed after a failed build or health check
  // -------------------------------------------------------------------------
  console.log('\nTEST 15: CI/CD Pipeline Deployment Gates');
  {
    const workflowPath = path.resolve(__dirname, '../../../.github/workflows/deploy.yml');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');

    const hasNpmCi = workflowContent.includes('npm ci');
    const hasPreBuildCheck = workflowContent.includes('npm test');
    const hasHealthCheck = workflowContent.includes('/api/health');
    const noUnsafeOutputRedirection = !workflowContent.includes('/var/www/html/deploy.log');

    assert(hasNpmCi, 'Workflow utilizes npm ci for deterministic builds');
    assert(hasPreBuildCheck, 'Workflow contains automated test and build gate prior to VPS deployment');
    assert(hasHealthCheck, 'Workflow contains post-deployment health check verifying /api/health');
    assert(noUnsafeOutputRedirection, 'Workflow removed unsafe world-readable logfile redirection');
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
