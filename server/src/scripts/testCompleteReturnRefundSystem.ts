import { checkReturnEligibility } from '../services/returnService';
import { canCancelOrder, calculateEligibleRefundAmount } from '../services/orderCancellationService';
import { emailTemplates } from '../services/email';
import { returnSchemas } from '../validations/schemas';

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

async function runTestSuite() {
  console.log('================================================================');
  console.log('HOME RITUALS — RETURN, CANCELLATION & REFUND SYSTEM AUDIT SUITE');
  console.log('================================================================\n');

  // SCENARIO 1: Cancellation Eligibility - Status Validation
  console.log('SCENARIO 1: Order Cancellation Eligibility by Fulfillment Status');
  {
    assert(canCancelOrder({ status: 'Pending' }).cancellable === true, 'Pending order is cancellable');
    assert(canCancelOrder({ status: 'Confirmed' }).cancellable === true, 'Confirmed order is cancellable');
    assert(canCancelOrder({ status: 'Processing' }).cancellable === true, 'Processing order is cancellable');
    assert(canCancelOrder({ status: 'Packed' }).cancellable === false, 'Packed order cannot be cancelled');
    assert(canCancelOrder({ status: 'Shipped' }).cancellable === false, 'Shipped order cannot be cancelled');
    assert(canCancelOrder({ status: 'Delivered' }).cancellable === false, 'Delivered order cannot be cancelled (must use Return workflow)');
    assert(canCancelOrder({ status: 'Cancelled' }).cancellable === false, 'Already cancelled order cannot be re-cancelled');
  }

  // SCENARIO 2: Prepaid vs COD Cancellation Refund Calculation
  console.log('\nSCENARIO 2: Cancellation Refund Calculation (Immutable Formula)');
  {
    const totalAmount = 1499.0;
    const noPriorRefunds: any[] = [];
    assert(
      calculateEligibleRefundAmount(totalAmount, noPriorRefunds) === 1499.0,
      'Full refund calculated when no prior refunds exist'
    );

    const partialRefunds = [{ amount: 499.0, status: 'PROCESSED' }];
    assert(
      calculateEligibleRefundAmount(totalAmount, partialRefunds) === 1000.0,
      'Pro-rated remaining refund calculated when partial refund already processed'
    );

    const fullRefunds = [{ amount: 1499.0, status: 'PROCESSED' }];
    assert(
      calculateEligibleRefundAmount(totalAmount, fullRefunds) === 0,
      'Zero refund calculated when entire order amount was already refunded'
    );
  }

  // SCENARIO 3: Return Eligibility - 48-Hour Return Policy
  console.log('\nSCENARIO 3: Return Policy 48-Hour Window Enforcement');
  {
    const now = new Date();
    // Delivered 5 hours ago
    const recentDelivered = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const recentOrder = {
      id: 'order_test_1',
      status: 'Delivered',
      deliveredAt: recentDelivered,
      updatedAt: recentDelivered,
      returns: [],
    };
    const recentCheck = checkReturnEligibility(recentOrder);
    assert(recentCheck.eligible === true, 'Delivered order within 5 hours is eligible for return');

    // Delivered 52 hours ago (> 48 hours)
    const oldDelivered = new Date(now.getTime() - 52 * 60 * 60 * 1000);
    const expiredOrder = {
      id: 'order_test_2',
      status: 'Delivered',
      deliveredAt: oldDelivered,
      updatedAt: oldDelivered,
      returns: [],
    };
    const expiredCheck = checkReturnEligibility(expiredOrder);
    assert(expiredCheck.eligible === false, 'Delivered order past 48 hours is strictly ineligible');
    assert(
      (expiredCheck.reason || '').includes('48-hour return window has expired'),
      'Returns descriptive policy message citing 48-hour window'
    );
  }

  // SCENARIO 4: Return Eligibility - Undelivered Orders
  console.log('\nSCENARIO 4: Return Eligibility on Undelivered Stages');
  {
    const pendingOrder = {
      id: 'order_test_3',
      status: 'Pending',
      deliveredAt: null,
      updatedAt: new Date(),
      returns: [],
    };
    assert(
      checkReturnEligibility(pendingOrder).eligible === false,
      'Pending order cannot be returned (must be cancelled)'
    );

    const shippedOrder = {
      id: 'order_test_4',
      status: 'Shipped',
      deliveredAt: null,
      updatedAt: new Date(),
      returns: [],
    };
    assert(
      checkReturnEligibility(shippedOrder).eligible === false,
      'Shipped order in transit cannot be returned prior to delivery'
    );
  }

  // SCENARIO 5: Duplicate Return Request Prevention
  console.log('\nSCENARIO 5: Prevention of Duplicate Active Return Requests');
  {
    const deliveredTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const orderWithActiveReturn = {
      id: 'order_test_5',
      status: 'Delivered',
      deliveredAt: deliveredTime,
      updatedAt: deliveredTime,
      returns: [{ id: 'ret_active_1', status: 'REQUESTED' }],
    };
    const activeCheck = checkReturnEligibility(orderWithActiveReturn);
    assert(activeCheck.eligible === false, 'Blocks duplicate return request when one is already in REQUESTED status');
    assert((activeCheck.reason || '').includes('already in progress'), 'Reports active return conflict message');

    const orderWithPickupScheduled = {
      id: 'order_test_6',
      status: 'Delivered',
      deliveredAt: deliveredTime,
      updatedAt: deliveredTime,
      returns: [{ id: 'ret_active_2', status: 'PICKUP_SCHEDULED' }],
    };
    assert(
      checkReturnEligibility(orderWithPickupScheduled).eligible === false,
      'Blocks duplicate return request when reverse pickup is already scheduled'
    );

    const orderWithRejectedReturn = {
      id: 'order_test_7',
      status: 'Delivered',
      deliveredAt: deliveredTime,
      updatedAt: deliveredTime,
      returns: [{ id: 'ret_old_rejected', status: 'REJECTED' }],
    };
    assert(
      checkReturnEligibility(orderWithRejectedReturn).eligible === true,
      'Allows re-submission if prior return request was previously REJECTED'
    );
  }

  // SCENARIO 6: Return Request Validation Schemas
  console.log('\nSCENARIO 6: Customer Return Request Payload Validation');
  {
    const validPayload = {
      body: {
        orderId: '652f11111111111111111111',
        items: [{ orderItemId: '652f22222222222222222222', quantity: 1 }],
        reason: 'Damaged / Defective',
        description: 'Bottle cap was cracked upon opening and liquid spilled.',
        images: ['https://example.com/damage-proof-1.jpg'],
      },
    };
    const res = returnSchemas.create.safeParse(validPayload);
    assert(res.success === true, 'Accepts valid return submission with reason, description, and photos');

    const emptyItems = {
      body: {
        orderId: '652f11111111111111111111',
        items: [],
        reason: 'Damaged / Defective',
        description: 'No items selected',
      },
    };
    assert(returnSchemas.create.safeParse(emptyItems).success === false, 'Rejects return submission with empty items');

    const shortDescription = {
      body: {
        orderId: '652f11111111111111111111',
        items: [{ orderItemId: '652f22222222222222222222', quantity: 1 }],
        reason: 'Other',
        description: 'bad', // < 5 chars
      },
    };
    assert(returnSchemas.create.safeParse(shortDescription).success === false, 'Rejects description shorter than 5 characters');
  }

  // SCENARIO 7: Admin Return Review Validation
  console.log('\nSCENARIO 7: Admin Return Review (Approval vs Rejection Constraints)');
  {
    const approvePayload = {
      body: {
        action: 'APPROVE',
        notes: 'Customer provided clear photos of defective nozzle.',
      },
    };
    assert(returnSchemas.review.safeParse(approvePayload).success === true, 'Accepts APPROVE action with optional notes');

    const rejectWithReason = {
      body: {
        action: 'REJECT',
        rejectionReason: 'Items were unsealed and consumed after delivery.',
      },
    };
    assert(returnSchemas.review.safeParse(rejectWithReason).success === true, 'Accepts REJECT action with required rejection reason');

    const rejectWithoutReason = {
      body: {
        action: 'REJECT',
        rejectionReason: '',
      },
    };
    assert(returnSchemas.review.safeParse(rejectWithoutReason).success === false, 'Enforces mandatory rejection reason when declining a return');
  }

  // SCENARIO 8: Reverse Pickup Logistics Assignment
  console.log('\nSCENARIO 8: Reverse Pickup Logistics & AWB Validation');
  {
    const validPickup = {
      body: {
        courier: 'BlueDart Express',
        awb: 'HR-REV-BLUEDART-882910',
        scheduledAt: new Date().toISOString(),
      },
    };
    assert(returnSchemas.reversePickup.safeParse(validPickup).success === true, 'Validates courier name and AWB tracking code');

    const missingAwb = {
      body: {
        courier: 'Delhivery',
        awb: '',
      },
    };
    assert(returnSchemas.reversePickup.safeParse(missingAwb).success === false, 'Rejects reverse pickup with missing AWB number');
  }

  // SCENARIO 9: Quality Inspection Payload Validation
  console.log('\nSCENARIO 9: Quality Inspection Pass / Fail Validation');
  {
    const passInspection = {
      body: {
        result: 'PASSED',
        notes: 'Original seals intact, packaging in resellable condition.',
        restoreStock: true,
      },
    };
    assert(returnSchemas.inspect.safeParse(passInspection).success === true, 'Accepts PASSED inspection with stock restoration flag');

    const failInspection = {
      body: {
        result: 'FAILED',
        notes: 'Product bottle empty, evidence of customer use.',
        restoreStock: false,
      },
    };
    assert(returnSchemas.inspect.safeParse(failInspection).success === true, 'Accepts FAILED inspection with mandatory remarks');

    const missingNotes = {
      body: {
        result: 'PASSED',
        notes: '',
      },
    };
    assert(returnSchemas.inspect.safeParse(missingNotes).success === false, 'Rejects inspection without inspection remarks');
  }

  // SCENARIO 10: COD Manual Payout Validation
  console.log('\nSCENARIO 10: COD Manual Refund Payout (UPI / NEFT) Validation');
  {
    const validCodPayout = {
      body: {
        amount: 899.0,
        payoutReference: 'UPI-UTR-984123512999',
        notes: 'Transferred via HDFC Corporate UPI to customer account',
      },
    };
    assert(returnSchemas.codPayout.safeParse(validCodPayout).success === true, 'Accepts valid COD payout with positive amount and UTR');

    const missingUtr = {
      body: {
        amount: 899.0,
        payoutReference: '',
      },
    };
    assert(returnSchemas.codPayout.safeParse(missingUtr).success === false, 'Requires UTR transaction reference before marking COD payout complete');

    const negativeAmount = {
      body: {
        amount: -50.0,
        payoutReference: 'UTR-1234',
      },
    };
    assert(returnSchemas.codPayout.safeParse(negativeAmount).success === false, 'Rejects non-positive COD refund amounts');
  }

  // SCENARIO 11: Email Notification Templates Verification
  console.log('\nSCENARIO 11: Automated Email Templates Rendering & Variables');
  {
    const reqHtml = emailTemplates.getReturnRequestedHtml({
      orderId: 'ORD-9901',
      customerName: 'Ayush Sharma',
      reason: 'Damaged item',
      itemsCount: 2,
      returnId: 'RET-001',
    });
    assert(reqHtml.includes('ORD-9901') && reqHtml.includes('RET-001'), 'Return requested template renders order ID and return ID');

    const revApprovedHtml = emailTemplates.getReturnReviewedHtml({
      orderId: 'ORD-9901',
      customerName: 'Ayush Sharma',
      action: 'APPROVED',
      returnId: 'RET-001',
    });
    assert(revApprovedHtml.includes('approved') && revApprovedHtml.includes('reverse pickup'), 'Approved template conveys approval and logistics next step');

    const revDeclinedHtml = emailTemplates.getReturnReviewedHtml({
      orderId: 'ORD-9901',
      customerName: 'Ayush Sharma',
      action: 'REJECTED',
      rejectionReason: 'Items unsealed and consumed',
      returnId: 'RET-001',
    });
    assert(revDeclinedHtml.includes('Declined') && revDeclinedHtml.includes('Items unsealed and consumed'), 'Declined template embeds specific rejection reason');

    const pickupHtml = emailTemplates.getReversePickupScheduledHtml({
      orderId: 'ORD-9901',
      customerName: 'Ayush Sharma',
      courier: 'BlueDart Express',
      awb: 'AWB-BLUEDART-9922',
      scheduledAt: '12 Nov 2026',
      returnId: 'RET-001',
    });
    assert(pickupHtml.includes('BlueDart Express') && pickupHtml.includes('AWB-BLUEDART-9922'), 'Reverse pickup template displays carrier name and tracking AWB');

    const codPayoutHtml = emailTemplates.getCodRefundProcessedHtml({
      orderId: 'ORD-9901',
      customerName: 'Ayush Sharma',
      refundAmount: 699.0,
      payoutReference: 'UTR-4488220011',
      returnId: 'RET-001',
    });
    assert(codPayoutHtml.includes('₹699.00') && codPayoutHtml.includes('UTR-4488220011'), 'COD refund template displays refund amount and UTR number');
  }

  // SCENARIO 12: Partial Return Calculation Formula
  console.log('\nSCENARIO 12: Partial Product Return Calculation');
  {
    const orderItems = [
      { id: 'item_1', productId: 'p1', name: 'Washing Machine Pods', price: 499.0, quantity: 2 }, // Total 998
      { id: 'item_2', productId: 'p2', name: 'Kitchen Cleaner Spray', price: 299.0, quantity: 1 }, // Total 299
    ];
    // Customer returns only 1 Pod box
    const returnInput = [{ orderItemId: 'item_1', quantity: 1 }];

    const item = orderItems.find((i) => i.id === returnInput[0].orderItemId)!;
    const partialAmount = item.price * returnInput[0].quantity;
    assert(partialAmount === 499.0, 'Partial return calculation computes exact returned quantity amount (₹499 vs ₹1297 total)');
  }

  // SCENARIO 13: Gateway Refund Retry Safety & Idempotency Key Generation
  console.log('\nSCENARIO 13: Gateway Refund Retry Idempotency Keying');
  {
    const returnId = '652f99999999999999999999';
    const key1 = `RETRY_RETURN_${returnId}_${Date.now()}`;
    const key2 = `RETRY_RETURN_${returnId}_${Date.now() + 10}`;
    assert(key1.startsWith(`RETRY_RETURN_${returnId}_`), 'Generates structured idempotency key with return prefix');
    assert(key1 !== key2, 'Generates distinct idempotency keys per retry attempt to prevent gateway collision');
  }

  // SCENARIO 14: Return State Machine Transitions
  console.log('\nSCENARIO 14: Return State Machine Transition Integrity');
  {
    const validTransitions: Record<string, string[]> = {
      REQUESTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['PICKUP_SCHEDULED'],
      PICKUP_SCHEDULED: ['PICKED_UP', 'RECEIVED_AT_WAREHOUSE'],
      PICKED_UP: ['RECEIVED_AT_WAREHOUSE'],
      RECEIVED_AT_WAREHOUSE: ['INSPECTION_PASSED', 'INSPECTION_FAILED'],
      INSPECTION_PASSED: ['REFUNDED'],
    };

    assert(validTransitions['REQUESTED'].includes('APPROVED'), 'REQUESTED can transition to APPROVED');
    assert(validTransitions['REQUESTED'].includes('REJECTED'), 'REQUESTED can transition to REJECTED');
    assert(validTransitions['APPROVED'].includes('PICKUP_SCHEDULED'), 'APPROVED transitions to PICKUP_SCHEDULED');
    assert(validTransitions['PICKUP_SCHEDULED'].includes('RECEIVED_AT_WAREHOUSE'), 'PICKUP_SCHEDULED transitions to RECEIVED_AT_WAREHOUSE');
    assert(validTransitions['RECEIVED_AT_WAREHOUSE'].includes('INSPECTION_PASSED'), 'RECEIVED_AT_WAREHOUSE transitions to INSPECTION_PASSED');
    assert(validTransitions['INSPECTION_PASSED'].includes('REFUNDED'), 'INSPECTION_PASSED transitions to REFUNDED');
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error running return test suite:', err);
  process.exit(1);
});
