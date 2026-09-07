import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { apiRequest } from '../utils/apiClient';

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Submits standard Paytm Show Payment Page form as a reliable redirection fallback
 */
function submitPaytmPaymentForm(paytmHost: string, mid: string, orderId: string, txnToken: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${paytmHost}/theia/api/v1/showPaymentPage?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}`;

  const midInput = document.createElement('input');
  midInput.type = 'hidden';
  midInput.name = 'mid';
  midInput.value = mid;
  form.appendChild(midInput);

  const orderIdInput = document.createElement('input');
  orderIdInput.type = 'hidden';
  orderIdInput.name = 'orderId';
  orderIdInput.value = orderId;
  form.appendChild(orderIdInput);

  const txnTokenInput = document.createElement('input');
  txnTokenInput.type = 'hidden';
  txnTokenInput.name = 'txnToken';
  txnTokenInput.value = txnToken;
  form.appendChild(txnTokenInput);

  document.body.appendChild(form);
  form.submit();
}

export function PaymentPage() {
  const { cart, shipping } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotal = cart.reduce((s, item) => s + item.product.price * item.quantity, 0);

  // Check URL query parameters for callback error redirection
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const err = searchParams.get('error');
    if (err) {
      setErrorMessage(decodeURIComponent(err));
    }
  }, [location.search]);

  const placeOrder = async () => {
    if (!shipping) {
      alert('Shipping details are missing!');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      // 1. Post to API to create the Paytm order & transaction token
      const paytmOrder = await apiRequest<any>('/api/create-order', 'POST', {
        addressId: shipping.id,
      });

      const orderId = paytmOrder.orderId || paytmOrder.order_id;
      const txnToken = paytmOrder.txnToken;
      const mid = paytmOrder.mid;
      const amount = paytmOrder.amount;
      const paytmHost = paytmOrder.paytmHost || 'https://securegw-stage.paytm.in';

      if (!txnToken) {
        throw new Error('Transaction initiation succeeded but no transaction token was returned.');
      }

      // 2. Load Paytm CheckoutJS script for the specific Merchant ID
      const checkoutScriptUrl = `${paytmHost}/merchantpgpui/checkoutjs/merchants/${mid}.js`;
      const scriptLoaded = await loadScript(checkoutScriptUrl);

      // 3. Trigger Paytm All-in-One Checkout JS if loaded, or fallback to standard form redirect
      if (scriptLoaded && (window as any).Paytm && (window as any).Paytm.CheckoutJS) {
        const checkoutConfig = {
          root: '',
          flow: 'DEFAULT',
          data: {
            orderId: orderId,
            token: txnToken,
            tokenType: 'TXN_TOKEN',
            amount: String(amount),
          },
          merchant: {
            mid: mid,
            name: 'Home Rituals',
            redirect: true,
          },
          handler: {
            notifyCurrencyCode: function () {},
            transactionStatus: function (paymentStatus: any) {
              console.log('[Paytm] Transaction status event:', paymentStatus);
            },
          },
        };

        try {
          await (window as any).Paytm.CheckoutJS.init(checkoutConfig);
          (window as any).Paytm.CheckoutJS.invoke();
        } catch (checkoutErr: any) {
          console.warn('[Paytm] CheckoutJS init failed, falling back to showPaymentPage form redirect:', checkoutErr);
          submitPaytmPaymentForm(paytmHost, mid, orderId, txnToken);
        }
      } else {
        // Redirection fallback for environments where CDN script is blocked
        submitPaytmPaymentForm(paytmHost, mid, orderId, txnToken);
      }
    } catch (error: any) {
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
        Review your shipping details and order before proceeding to secure payment via Paytm.
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
              <div>{shipping.phone}</div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-[#6f6f6f]">No shipping details provided.</div>
          )}
        </div>

        <div className="rounded-md border border-black/5 bg-white p-4">
          <h2 className="font-semibold text-lg text-[#242424]">Order</h2>
          <div className="mt-2 space-y-2 text-sm text-[#333]">
            {cart.map((item) => (
              <div key={item.productId} className="flex justify-between">
                <div>{item.product.name} × {item.quantity}</div>
                <div>₹{item.product.price * item.quantity}</div>
              </div>
            ))}
            <div className="mt-4 border-t border-black/5 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>₹{subtotal}</span>
            </div>
          </div>
        </div>

        {/* Paytm Staging Notice */}
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse"></span>
            <span>Secured with <strong>Paytm Payment Gateway</strong> (Test/Staging Mode)</span>
          </div>
          <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-sky-200">Test Mode</span>
        </div>

        <div className="flex gap-3">
          <Button className="px-6 py-3" onClick={() => navigate(-1)} disabled={loading}>
            Back
          </Button>
          <Button className="px-6 py-3" onClick={placeOrder} disabled={loading || cart.length === 0}>
            {loading ? 'Processing Order...' : 'Place order & Pay via Paytm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
