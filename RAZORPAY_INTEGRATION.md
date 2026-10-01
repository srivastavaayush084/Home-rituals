# Razorpay Payment Gateway Integration Guide (Test/Sandbox & Live/Production)

## 1. Migration Overview

The project has been migrated from Paytm to the official **Razorpay Payment Gateway (Standard Checkout with HMAC-SHA256 Server Verification)**.

### Summary of Removals:
- **Paytm SDK packages**: Removed `paytmchecksum` and `@types/paytmchecksum` from `server/package.json`.
- **Paytm services**: Removed `server/src/services/paytm.ts`.
- **Paytm frontend components**: Replaced Paytm CheckoutJS script and form submission in `Home Rituals/src/pages/PaymentPage.tsx`.
- **Paytm test console**: Replaced `PaytmDemoPage.tsx` with `RazorpayDemoPage.tsx` mounted at `/razorpay-demo`.
- **Paytm environment variables**: Removed `PAYTM_*` and `VITE_PAYTM_*` across backend and frontend configurations.

### Summary of Additions & Enhancements:
- **Official Razorpay SDK**: Integrated `razorpay` official client library in `server/src/services/razorpay.ts`.
- **Clean Service Architecture**: Created dedicated `RazorpayPaymentService` layer with methods for order creation, HMAC-SHA256 signature verification, webhook validation, and payment status checks.
- **Strict Server-Side Validation**: Final payable amount is always calculated and validated on the server by inspecting cart items, current prices, and stock in DB. Client-provided amounts are never trusted.
- **Cryptographic Signature Verification**: Every completed payment is cryptographically verified server-side using constant-time comparison (`crypto.timingSafeEqual`) against `RAZORPAY_KEY_SECRET`.
- **Idempotent Order Finalization**: Ensures orders are not duplicated and inventory/emails are never triggered twice, even if both frontend verification and asynchronous webhooks fire.
- **Full Webhook Handling**: Added `POST /api/payments/razorpay/webhook` with raw request body buffer capture for validating `X-Razorpay-Signature`.
- **Sandbox Testing Console**: Interactive developer testing console at `http://localhost:5173/razorpay-demo` with real-time lifecycle logs.
- **Admin Panel Visibility**: Admin Orders table and details modal show Payment Gateway (Razorpay), Payment ID, Razorpay Order ID, payment status, and timestamp.
- **Backward Compatibility**: Existing database records and historical orders remain completely accessible without data loss.

---

## 2. Architecture & Payment Flow

```
CUSTOMER                  FRONTEND (Home Rituals)             BACKEND (Express API)              RAZORPAY GATEWAY
   |                                 |                                  |                               |
   |---- 1. Click "Pay" ------------>|                                  |                               |
   |                                 |---- 2. POST /api/payments/ ----->|                               |
   |                                 |        razorpay/create-order     |                               |
   |                                 |                                  |-- 3. Calculate amount from DB |
   |                                 |                                  |-- 4. Convert to paise         |
   |                                 |                                  |-- 5. Create Order via SDK --->|
   |                                 |                                  |<-- 6. Return order_id --------|
   |                                 |<--- 7. Return { orderId, --------|
   |                                 |        amount, keyId }           |
   |                                 |                                  |
   |                                 |---- 8. Open Razorpay Checkout -->|
   |<--- 9. Render Checkout Modal ---|                                  |
   |                                 |                                  |
   |---- 10. Complete Payment (UPI/Card/NetBanking) --------------------------------------------------->|
   |                                                                                                    |
   |<--- 11. Return { razorpay_payment_id, razorpay_order_id, razorpay_signature } ---------------------|
   |                                 |
   |                                 |---- 12. POST /api/payments/razorpay/verify --------------------->|
   |                                 |         { razorpay_payment_id, order_id, signature }             |
   |                                 |                                                                  |-- 13. Verify HMAC-SHA256
   |                                 |                                                                  |-- 14. Fetch payment status
   |                                 |                                                                  |-- 15. Check idempotency
   |                                 |                                                                  |-- 16. Deduct inventory & DB
   |                                 |                                                                  |-- 17. Send confirmation email
   |                                 |<--- 18. Return { success: true, order } -------------------------|
   |                                 |
   |<--- 19. Redirect to /order-success/:orderId
```

---

## 3. Environment Variables Configuration

### Backend (`server/.env`)

```env
# Server settings
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Razorpay Gateway Configuration
# Set to 'test' for Sandbox and 'production' for Live
RAZORPAY_ENV=test
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

> [!CAUTION]
> Never commit `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to GitHub or expose them in client-side code.

### Frontend (`Home Rituals/.env`)

```env
# Base API URL
VITE_API_URL=http://localhost:5000

# Optional: Public Key ID (the backend automatically returns keyId dynamically during order creation)
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

---

## 4. API Endpoints Reference

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/payments/razorpay/create-order` | Yes | Validates cart, stock, and calculates amount; creates order on Razorpay |
| `POST` | `/api/payments/razorpay/verify` | Yes | Verifies HMAC-SHA256 signature, validates payment, finalizes order |
| `POST` | `/api/payments/razorpay/webhook` | No (HMAC Verified) | Asynchronous webhook handler for Razorpay events (`payment.captured`, `order.paid`, `refund.processed`, `refund.failed`, `refund.created`) |
| `POST` | `/api/orders/:id/cancel` | Yes (Owner/Admin) | Cancels order, returns stock, initiates Razorpay refund for online payments, sends cancellation email |
| `POST` | `/api/create-order` | Yes | Backward-compatible alias for `/api/payments/razorpay/create-order` |
| `POST` | `/api/verify-payment` | Yes | Backward-compatible alias for `/api/payments/razorpay/verify` |

---

## 5. Webhook Configuration

### Setting up Webhooks in Razorpay Dashboard:
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Navigate to **Settings** → **Webhooks** → **Add New Webhook**.
3. Set **Webhook URL**:
   - Local testing: Use Ngrok (e.g. `https://your-ngrok-domain.ngrok-free.app/api/payments/razorpay/webhook`)
   - Production: `https://YOUR-PRODUCTION-DOMAIN/api/payments/razorpay/webhook`
4. Set **Secret**: Enter a strong random secret and copy it into `RAZORPAY_WEBHOOK_SECRET` in `server/.env`.
5. Subscribe to Active Events:
   - `order.paid`
   - `payment.captured`
   - `payment.failed`
   - `refund.processed` *(Required for automated refund reconciliation)*
   - `refund.failed` *(Required for automated refund failure alerts)*
   - `refund.created`
6. Click **Create Webhook**.

---

## 6. Order Cancellation & Razorpay Refund System

### Architecture & Cancellation Lifecycle

```
CUSTOMER                            FRONTEND                     BACKEND                          RAZORPAY GATEWAY
   │                                   │                            │                                    │
   │── 1. Clicks "Cancel Order" ──────>│                            │                                    │
   │   (Selects reason & optional note)│                            │                                    │
   │                                   │── 2. POST /orders/:id/cancel ──>│                               │
   │                                   │      { reason, comment }   │                                    │
   │                                   │                            │── 3. Authenticate user             │
   │                                   │                            │── 4. Verify ownership & rules      │
   │                                   │                            │── 5. Return stock to inventory     │
   │                                   │                            │── 6. Check payment status          │
   │                                   │                            │                                    │
   │                                   │                            ├── COD / Unpaid:                    │
   │                                   │                            │   Set Status = CANCELLED           │
   │                                   │                            │   Refund = NOT_APPLICABLE          │
   │                                   │                            │                                    │
   │                                   │                            └── Online Paid (Razorpay):          │
   │                                   │                                ├── Calculate eligible refund    │
   │                                   │                                ├── Create Refund audit record   │
   │                                   │                                ├── Call rzp.payments.refund() ─>│
   │                                   │                                │   (paise converted)            │
   │                                   │                                │<── Return refund ID & status ──│
   │                                   │                                ├── Status = CANCELLED           │
   │                                   │                                ├── Refund = PROCESSING          │
   │                                   │                                └── Send cancellation email      │
   │                                   │<── 7. Return 200 OK ───────│                                    │
   │<── 8. Display Cancelled & ────────│      { order, refund }                                          │
   │       Refund Status                                                                                 │
   │                                                                                                     │
   │                                                                                                     │
   │   ASYNCHRONOUS RECONCILIATION VIA WEBHOOK                                                           │
   │                                                                │<── 9. POST /webhook ───────────────│
   │                                                                │       event: refund.processed      │
   │                                                                │── 10. Verify HMAC signature        │
   │                                                                │── 11. Mark Refund PROCESSED        │
   │                                                                │── 12. Mark Payment REFUNDED        │
   │                                                                │── 13. Send Refund Processed Email ─│
   │<── 14. Customer receives Refund Processed Email ───────────────│                                    │
```

### State Machine Model

| Entity | Possible States | Transition Trigger |
|---|---|---|
| **Order Status** | `Pending` → `Confirmed` → `Processing` → `Cancelled` | Customer cancellation or Admin update |
| **Payment Status** | `Pending` → `Paid` → `Refunded` | Payment capture & Webhook `refund.processed` |
| **Refund Status** | `NOT_APPLICABLE` \| `PENDING` → `PROCESSING` → `PROCESSED` \| `FAILED` | Cancellation API & Webhook reconciliation |

### Centralized Backend Source of Truth: `canCancelOrder()`
- **Cancellable**: `Pending`, `Confirmed`, `Processing`
- **Non-Cancellable**: `Packed`, `Shipped`, `Delivered`, `Cancelled`, `Returned`, `Refunded`

### Prevention of Duplicate Refunds & Race Conditions
1. Backend enforces server-side calculation of `eligibleRefundAmount`: original order total minus any previous successful or processing refunds.
2. If already refunded or refund is actively processing, subsequent calls are rejected or return the existing refund state.
3. Database transactions restore inventory stock safely.
4. Email delivery failures are isolated and never roll back a successful order cancellation or refund.

---

## 7. Testing Procedure (Test Mode)

### Automated Tests
Run the comprehensive test suite verifying cancellation business rules, refund calculation, Zod validation, and webhook signature verification:
```bash
cd server
npm run test
```

### Testing Instruments:
- **Card**: Number `4111 1111 1111 1111`, any future expiry date, CVV `123`, OTP `123456`.
- **UPI**: `success@razorpay`

---

## 8. Production Migration Steps

When you are ready to process real transactions:

1. Obtain your Live API credentials from [Razorpay Dashboard](https://dashboard.razorpay.com) (switch from Test mode to Live mode).
2. Update `server/.env` on your production server:
   ```env
   RAZORPAY_ENV=production
   RAZORPAY_KEY_ID=rzp_live_your_actual_live_key
   RAZORPAY_KEY_SECRET=your_actual_live_secret
   RAZORPAY_WEBHOOK_SECRET=your_production_webhook_secret
   ```
3. Update production Webhook URL in Razorpay Dashboard pointing to:
   `https://YOUR-DOMAIN/api/payments/razorpay/webhook`
   Subscribed events: `order.paid`, `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`, `refund.created`.
4. Perform production smoke test with a real transaction (e.g. ₹1.00) to confirm end-to-end receipt, signature validation, cancellation, and refund initiation.

