# Paytm Payment Gateway Integration Guide (Test/Staging & Production)

## 1. Migration Overview

The legacy Razorpay Test Mode integration has been completely removed and replaced with the current official **Paytm Payment Gateway (Test/Staging & Production)** integration.

### Summary of Removals:
- **Razorpay npm package**: Uninstalled `razorpay` from `server/package.json`.
- **Razorpay service**: Removed `server/src/services/razorpay.ts`.
- **Razorpay demo page**: Removed `Home Rituals/src/pages/RazorpayDemoPage.tsx` and route `/razorpay-demo`.
- **Razorpay checkout scripts**: Removed `checkout.razorpay.com` and `window.Razorpay` from `PaymentPage.tsx`.
- **Razorpay schema attributes**: Replaced `razorpayOrderId`, `razorpayPaymentId`, and `razorpaySignature` in Prisma `Order` model with gateway-neutral generic attributes (`paymentGateway`, `transactionId`, `gatewayOrderId`, `signature`).
- **Razorpay environment variables**: Removed `RAZORPAY_*` and `VITE_RAZORPAY_*` across backend and frontend.

### Summary of Additions:
- **Official Paytm Checksum Package**: Installed `paytmchecksum` and `@types/paytmchecksum`.
- **Dedicated Paytm Service**: Created `server/src/services/paytm.ts` providing transaction initiation, digital checksum verification, and Server-to-Server (S2S) status verification.
- **Paytm Payment Controller**: Updated `server/src/controllers/paymentController.ts` with `initiatePaymentDirect`, `handlePaytmCallback`, `verifyPaymentDirect`, and `handleWebhook`.
- **Paytm All-in-One Checkout UI**: Updated `Home Rituals/src/pages/PaymentPage.tsx` with dynamic Paytm CheckoutJS loader and standard form redirect fallback.
- **Paytm Staging Testing Console**: Created `Home Rituals/src/pages/PaytmDemoPage.tsx` mounted at `/paytm-demo`.

---

## 2. Architecture & Payment Flow

```
+------------------+         1. POST /api/create-order         +-----------------------+
|                  | ----------------------------------------> |                       |
|   Home Rituals   |                                           |  Home Rituals Server  |
|     Frontend     | <---------------------------------------- |                       |
|  (PaymentPage)   |         2. Return { txnToken, orderId }   +-----------------------+
+------------------+                                                       |
        |                                                                  | 1a. S2S Initiate
        | 3. Launch CheckoutJS or                                          |     Transaction
        |    Form POST with txnToken                                       v
        v                                                      +-----------------------+
+------------------+                                           |                       |
|  Paytm Staging   |                                           |     Paytm Gateway     |
| Payment Gateway  |                                           |  (securegw-stage.     |
| (Card/NetBanking/|                                           |       paytm.in)       |
|      UPI)        |                                           |                       |
+------------------+                                           +-----------------------+
        |                                                                  ^
        | 4. User Completes Payment                                        |
        v                                                                  |
+--------------------------------------------------------------------------+
| 5. POST /api/payments/callback (application/x-www-form-urlencoded)
v
+-----------------------+
|  Home Rituals Server  |
|  1. Verify Checksum   |
|  2. Query S2S Status  | ---------> 6. S2S /order/status Verification
|  3. Finalize Order    | <--------- 7. Status === 'TXN_SUCCESS'
|  4. Clear Cart        |
|  5. Decrement Stock   |
|  6. Send Emails       |
+-----------------------+
        |
        | 8. HTTP 302 Redirect
        v
+------------------------------------------+
| Success: /order-success/:orderId         |
| Failure: /payment?error={errorMessage}   |
+------------------------------------------+
```

---

## 3. Required Environment Variables

### Backend (`server/.env`)

| Variable Name | Description | Example (Staging) |
|---|---|---|
| `PAYTM_MID` | Merchant ID issued in Paytm Developer Dashboard | `YOUR_STAGING_MID` |
| `PAYTM_MERCHANT_KEY` | Secret Merchant Key for checksum encryption | `YOUR_STAGING_KEY` |
| `PAYTM_WEBSITE` | Website parameter | `WEBSTAGING` (for staging) / `DEFAULT` (for prod) |
| `PAYTM_CHANNEL_ID` | Integration channel | `WEB` |
| `PAYTM_INDUSTRY_TYPE` | Merchant industry category | `Retail` |
| `PAYTM_ENVIRONMENT` | Target environment (`STAGING` or `PROD`) | `STAGING` |
| `PAYTM_CALLBACK_URL` | Full URL receiving Paytm callback POST | `http://localhost:5000/api/payments/callback` |
| `PAYMENT_MOCK_MODE` | Development-only mock mode (optional) | `false` |

> [!CAUTION]
> Never expose `PAYTM_MERCHANT_KEY` to the client or commit actual secrets to version control.

### Frontend (`Home Rituals/.env`)

| Variable Name | Description | Example (Staging) |
|---|---|---|
| `VITE_PAYTM_MID` | Public Merchant ID for CheckoutJS script loader | `YOUR_STAGING_MID` |

---

## 4. How to Start the Application

### 1. Backend Server:
```powershell
cd "server"
npm install
npm run dev
```
Server runs at `http://localhost:5000`.

### 2. Frontend Client:
```powershell
cd "Home Rituals"
npm install
npm run dev
```
Client runs at `http://localhost:5173`.

---

## 5. Testing Payments in Staging Mode

### Standard Store Checkout Flow:
1. Log in or create an account.
2. Add products from the shop to your cart.
3. Proceed to Checkout and provide/select a shipping address.
4. Click **Place order & Pay via Paytm**.
5. The backend initiates the transaction, validates stock and cart amounts on the server, generates the digital signature, and requests a `txnToken` from Paytm.
6. The Paytm All-in-One Checkout modal opens (with automatic fallback to Paytm's secure showPaymentPage form redirect).
7. Complete test payment using Paytm sandbox credentials.
8. Paytm redirects to the callback URL where the server verifies the checksum and S2S transaction status.
9. Upon verification, the order is confirmed, stock is deducted, cart is cleared, confirmation email is dispatched, and the user lands on the Order Success page.

### Developer Testing Console (`/paytm-demo`):
- Visit `http://localhost:5173/paytm-demo`.
- Set custom transaction amounts (e.g. ₹5.00).
- Observe the real-time Checkout Lifecycle Log detailing:
  1. Parameters Preparation
  2. Backend Transaction Initiation
  3. Paytm CheckoutJS Modal Launch
  4. Server-to-Server (S2S) Status Verification

---

## 6. Switching to Production

To switch from Paytm Staging to Live Production:

1. Update `server/.env`:
   ```env
   PAYTM_MID=your_production_mid
   PAYTM_MERCHANT_KEY=your_production_merchant_key
   PAYTM_WEBSITE=DEFAULT
   PAYTM_ENVIRONMENT=PROD
   PAYTM_CALLBACK_URL=https://homerituals.co/api/payments/callback
   PAYMENT_MOCK_MODE=false
   ```
2. Update `Home Rituals/.env`:
   ```env
   VITE_PAYTM_MID=your_production_mid
   ```
3. When `PAYTM_ENVIRONMENT=PROD`, the backend automatically switches gateway hosts:
   - Staging: `https://securegw-stage.paytm.in`
   - Production: `https://securegw.paytm.in`
