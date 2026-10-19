import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { apiRequest } from '../utils/apiClient';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof (window as any).Razorpay === 'function') {
      resolve(true);
      return;
    }

    const scriptSrc = 'https://checkout.razorpay.com/v1/checkout.js';
    let script = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      document.body.appendChild(script);
    }

    const checkInterval = setInterval(() => {
      if (typeof (window as any).Razorpay === 'function') {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 50);

    script.addEventListener('load', () => {
      clearInterval(checkInterval);
      resolve(typeof (window as any).Razorpay === 'function');
    });

    script.addEventListener('error', () => {
      clearInterval(checkInterval);
      resolve(false);
    });

    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(typeof (window as any).Razorpay === 'function');
    }, 10000);
  });
}

export function PaymentPage() {
  const { cart, shipping, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotal = cart.reduce((s, item) => s + item.product.price * item.quantity, 0);

  // Check URL query parameters for callback or cancellation errors
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const err = searchParams.get('error');
    if (err) {
      setErrorMessage(decodeURIComponent(err));
    }
  }, [location.search]);

  const placeOrder = async () => {
    if (!shipping) {
      alert('Shipping details are missing! Please return to checkout.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      // 1. Request backend to create Razorpay Order & return public Key ID
      // Amount is calculated and verified strictly on the server
      const rzpOrderResponse = await apiRequest<any>('/api/payments/razorpay/create-order', 'POST', {
        addressId: shipping.id,
      });

      const orderData = rzpOrderResponse.data || rzpOrderResponse;
      const rzpOrderId = orderData.orderId || orderData.order_id;
      const amountInPaise = orderData.amount;
      const currency = orderData.currency || 'INR';
      const keyId = orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!rzpOrderId) {
        throw new Error('Order creation succeeded on server, but no Razorpay Order ID was returned.');
      }

      if (!keyId) {
        throw new Error('Razorpay public key is missing. Please ensure RAZORPAY_KEY_ID is configured.');
      }

      // 2. Ensure official Razorpay Checkout SDK script is loaded
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || typeof (window as any).Razorpay !== 'function') {
        throw new Error('Razorpay Checkout SDK failed to load. Please check your network connection or adblocker.');
      }

      // 3. Configure Razorpay Standard Checkout options
      const options: any = {
        key: keyId,
        amount: amountInPaise,
        currency,
        name: 'Home Rituals',
        description: 'Luxury Home Hygiene & Care Essentials',
        order_id: rzpOrderId,
        prefill: {
          name: orderData.prefill?.name || user?.name || shipping.fullName || '',
          email: orderData.prefill?.email || user?.email || '',
          contact: shipping.phone || orderData.prefill?.contact || user?.phone || '',
        },
        notes: {
          shippingAddress: `${shipping.address1}, ${shipping.city}, ${shipping.state} - ${shipping.postalCode}`,
        },
        theme: {
          color: '#44D62C',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            console.log('[Razorpay Checkout] User dismissed the payment modal.');
          },
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            setLoading(true);
            console.log('[Razorpay Checkout] Payment completed by customer. Verifying signature on server...');

            // 4. Send payment credentials to backend for server-side cryptographic verification
            const verifyResult = await apiRequest<any>('/api/payments/razorpay/verify', 'POST', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              addressId: shipping.id,
            });

            const confirmedOrder =
              verifyResult?.order ||
              verifyResult?.data?.order ||
              verifyResult?.data ||
              verifyResult;

            const confirmedOrderId = confirmedOrder?.id;

            if (confirmedOrderId) {
              navigate(`/order-success/${confirmedOrderId}`);
            } else {
              navigate('/profile');
            }
          } catch (verifyErr: any) {
            console.error('[Razorpay Verification Error]:', verifyErr);
            setErrorMessage(verifyErr.message || 'Payment signature verification failed. Please contact support.');
            setLoading(false);
          }
        },
      };

      // 4. Instantiate & open Razorpay modal
      const RazorpayConstructor = (window as any).Razorpay;
      if (typeof RazorpayConstructor !== 'function') {
        throw new Error('Razorpay Checkout SDK is not available as a constructor. Please refresh the page and try again.');
      }
      const razorpayInstance = new RazorpayConstructor(options);

      razorpayInstance.on('payment.failed', function (failureResponse: any) {
        console.error('[Razorpay Payment Failed]:', failureResponse?.error);
        const errorDesc = failureResponse?.error?.description || failureResponse?.error?.reason || 'Payment failed or was declined by bank.';
        setErrorMessage(errorDesc);
        setLoading(false);
      });

      razorpayInstance.open();
    } catch (error: any) {
      console.error('[Checkout Error]:', error);
      setErrorMessage(error.message || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>
        Payment & summary
      </h1>
      <p className="mt-2 text-sm text-[#6f6f6f]">
        Review your shipping details and order items before proceeding to secure payment via Razorpay.
      </p>

      {errorMessage && (
        <div className="mt-6 rounded-2xl bg-red-50 p-4 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <span className="font-bold">Payment Error:</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <div className="rounded-md border border-black/5 bg-white p-4">
          <h2 className="font-semibold text-lg text-[#242424]">Shipping</h2>
          {shipping ? (
            <div className="mt-2 text-sm text-[#333]">
              <div>{shipping.fullName}</div>
              <div>{shipping.address1} {shipping.address2}</div>
              {shipping.landmark ? <div>Landmark: {shipping.landmark}</div> : null}
              <div>{shipping.city}, {shipping.state} {shipping.postalCode}</div>
              <div>{shipping.country}</div>
              <div>Phone: {shipping.phone}</div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-[#6f6f6f]">No shipping details provided.</div>
          )}
        </div>

        <div className="rounded-md border border-black/5 bg-white p-4">
          <h2 className="font-semibold text-lg text-[#242424]">Order Summary</h2>
          <div className="mt-2 space-y-2 text-sm text-[#333]">
            {cart.map((item) => (
              <div key={item.productId} className="flex justify-between">
                <div>{item.product.name} × {item.quantity}</div>
                <div>₹{(item.product.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
            <div className="mt-4 border-t border-black/5 pt-2 flex justify-between font-semibold">
              <span>Total Payable</span>
              <span className="text-[#0B8F3C] text-lg">₹{subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Razorpay Security Notice */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs text-emerald-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#44D62C] animate-pulse"></span>
            <span>Secured with <strong>Razorpay Payment Gateway</strong> (UPI, Cards, NetBanking, Wallets)</span>
          </div>
          <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-700">
            256-bit Encrypted
          </span>
        </div>

        <div className="flex gap-3">
          <Button className="px-6 py-3" onClick={() => navigate(-1)} disabled={loading}>
            Back
          </Button>
          <Button className="px-6 py-3" onClick={placeOrder} disabled={loading || cart.length === 0}>
            {loading ? 'Processing Order...' : 'Place order & Pay with Razorpay'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
