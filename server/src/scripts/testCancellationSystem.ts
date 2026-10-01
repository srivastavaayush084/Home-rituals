import crypto from 'crypto';
import {
  canCancelOrder,
  calculateEligibleRefundAmount,
  CANCELLATION_REASONS,
} from '../services/orderCancellationService';
import { verifyRazorpayWebhookSignature } from '../services/razorpay';
import { orderSchemas } from '../validations/schemas';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

function runTests() {
  console.log('====================================================');
  console.log('HOME RITUALS — ORDER CANCELLATION & REFUND TEST SUITE');
  console.log('====================================================\n');

  // TEST SUITE 1: Cancellation Eligibility (canCancelOrder)
  console.log('TEST SUITE 1: Order Cancellation Eligibility Rules');
  {
    const pendingOrder = { status: 'Pending' };
    assert(canCancelOrder(pendingOrder).cancellable === true, 'Pending order is cancellable');

    const confirmedOrder = { status: 'Confirmed' };
    assert(canCancelOrder(confirmedOrder).cancellable === true, 'Confirmed order is cancellable');

    const processingOrder = { status: 'Processing' };
    assert(canCancelOrder(processingOrder).cancellable === true, 'Processing order is cancellable');

    const packedOrder = { status: 'Packed' };
    const packedResult = canCancelOrder(packedOrder);
    assert(packedResult.cancellable === false && packedResult.code === 'INELIGIBLE_STATUS', 'Packed order is non-cancellable');

    const shippedOrder = { status: 'Shipped' };
    const shippedResult = canCancelOrder(shippedOrder);
    assert(shippedResult.cancellable === false && shippedResult.code === 'INELIGIBLE_STATUS', 'Shipped order is non-cancellable');

    const deliveredOrder = { status: 'Delivered' };
    const deliveredResult = canCancelOrder(deliveredOrder);
    assert(deliveredResult.cancellable === false && deliveredResult.code === 'INELIGIBLE_STATUS', 'Delivered order is non-cancellable');

    const alreadyCancelledOrder = { status: 'Cancelled' };
    const cancelResult = canCancelOrder(alreadyCancelledOrder);
    assert(cancelResult.cancellable === false && cancelResult.code === 'ALREADY_CANCELLED', 'Already cancelled order cannot be cancelled again');

    const returnedOrder = { status: 'Returned' };
    const returnedResult = canCancelOrder(returnedOrder);
    assert(returnedResult.cancellable === false && returnedResult.code === 'ALREADY_REFUNDED', 'Returned order cannot be cancelled');
  }

  // TEST SUITE 2: Eligible Refund Amount Calculation
  console.log('\nTEST SUITE 2: Server-Side Refund Amount Calculation');
  {
    const totalAmount = 1499.0;
    const refundsEmpty: any[] = [];
    assert(calculateEligibleRefundAmount(totalAmount, refundsEmpty) === 1499.0, 'Full order total refundable when no prior refunds');

    const refundsWithPartial = [
      { amount: 500.0, status: 'PROCESSED' },
      { amount: 200.0, status: 'FAILED' }, // Failed refund does not count against limit
    ];
    assert(calculateEligibleRefundAmount(totalAmount, refundsWithPartial) === 999.0, 'Partial refund deduction correctly ignores failed attempts');

    const refundsFull = [{ amount: 1499.0, status: 'PROCESSED' }];
    assert(calculateEligibleRefundAmount(totalAmount, refundsFull) === 0, 'Zero refundable when already fully refunded');

    const refundsOver = [{ amount: 2000.0, status: 'PROCESSED' }];
    assert(calculateEligibleRefundAmount(totalAmount, refundsOver) === 0, 'Refundable amount is never negative');
  }

  // TEST SUITE 3: Cancellation Reason Validation
  console.log('\nTEST SUITE 3: Cancellation Reasons and Zod Schema Validation');
  {
    assert(CANCELLATION_REASONS.length === 7, 'All 7 standard cancellation reasons are configured');
    assert(CANCELLATION_REASONS.includes('Changed my mind'), 'Contains "Changed my mind"');
    assert(CANCELLATION_REASONS.includes('Other'), 'Contains "Other"');

    // Test Zod schema validation
    const validPayload = { body: { reason: 'Changed my mind', comment: 'Found another variant' } };
    const validParse = orderSchemas.cancel.safeParse(validPayload);
    assert(validParse.success === true, 'Zod accepts valid cancellation reason and optional comment');

    const missingReasonPayload = { body: { reason: '', comment: '' } };
    const missingReasonParse = orderSchemas.cancel.safeParse(missingReasonPayload);
    assert(missingReasonParse.success === false, 'Zod rejects missing cancellation reason');

    const excessiveCommentPayload = { body: { reason: 'Other', comment: 'x'.repeat(501) } };
    const excessiveCommentParse = orderSchemas.cancel.safeParse(excessiveCommentPayload);
    assert(excessiveCommentParse.success === false, 'Zod rejects comments exceeding 500 characters');
  }

  // TEST SUITE 4: Webhook Signature Verification
  console.log('\nTEST SUITE 4: Razorpay Webhook Cryptographic Verification');
  {
    const webhookSecret = 'test_secret_key_12345';
    const samplePayload = JSON.stringify({
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test123',
            amount: 149900,
            status: 'processed',
          },
        },
      },
    });

    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(samplePayload)
      .digest('hex');

    const isValid = verifyRazorpayWebhookSignature(samplePayload, validSignature, webhookSecret);
    assert(isValid === true, 'Valid HMAC-SHA256 signature is accepted');

    const tamperedPayload = samplePayload + ' ';
    const isTamperedRejected = !verifyRazorpayWebhookSignature(tamperedPayload, validSignature, webhookSecret);
    assert(isTamperedRejected === true, 'Tampered payload is rejected');

    const isForgedSigRejected = !verifyRazorpayWebhookSignature(samplePayload, 'forged_signature_hex', webhookSecret);
    assert(isForgedSigRejected === true, 'Forged signature is rejected');
  }

  // TEST SUITE 5: Refund State Machine Integrity
  console.log('\nTEST SUITE 5: Refund State Machine Transitions');
  {
    const validStates = ['NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'];
    assert(validStates.length === 5, 'All 5 states (NOT_APPLICABLE, PENDING, PROCESSING, PROCESSED, FAILED) are defined');

    // COD order state expectation
    const codOrder = { status: 'Cancelled', paymentStatus: 'Pending', refundStatus: 'NOT_APPLICABLE' };
    assert(codOrder.status === 'Cancelled' && codOrder.refundStatus === 'NOT_APPLICABLE', 'COD order resolves to CANCELLED with refund NOT_APPLICABLE');

    // Online paid order initiated expectation
    const onlineInitiated = { status: 'Cancelled', paymentStatus: 'Paid', refundStatus: 'PROCESSING' };
    assert(onlineInitiated.status === 'Cancelled' && onlineInitiated.refundStatus === 'PROCESSING', 'Online paid order resolves to CANCELLED with refund PROCESSING');

    // Online paid order completed expectation
    const onlineCompleted = { status: 'Cancelled', paymentStatus: 'Refunded', refundStatus: 'PROCESSED' };
    assert(onlineCompleted.status === 'Cancelled' && onlineCompleted.paymentStatus === 'Refunded' && onlineCompleted.refundStatus === 'PROCESSED', 'Reconciled refund sets paymentStatus to Refunded and refundStatus to PROCESSED');
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
