import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { apiRequest } from '../utils/apiClient';

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentPage() {
  const { cart, shipping, clearCart } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const subtotal = cart.reduce((s, item) => s + item.product.price * item.quantity, 0);

  useEffect(() => {
    // Load Razorpay script on mount
    loadScript('https://checkout.razorpay.com/v1/checkout.js');
  }, []);

  const placeOrder = async () => {
    if (!shipping) {
      alert('Shipping details are missing!');
      return;
    }

    try {
      setLoading(true);

      // 1. Post to API to create the Order and get Razorpay order parameters
      const response = await apiRequest<any>('/api/orders', 'POST', {
        addressId: shipping.id,
      });

      const { order, razorpayOrder } = response;

      // 2. Trigger Payment Workflow
      if (razorpayOrder.id.startsWith('order_mock_')) {
        // Simulation flow for local testing (mock mode)
        const mockVerifyData = {
          orderId: order.id,
          razorpayOrderId: razorpayOrder.id,
          razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(7)}`,
          razorpaySignature: 'mock_signature',
        };

        await apiRequest('/api/payments/verify', 'POST', mockVerifyData);
        await clearCart();
        alert('Order placed successfully! (Mock payment simulated)');
        navigate('/');
      } else {
        // Live Razorpay Widget Integration
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mockkey', // Public Key ID
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'Home Rituals',
          description: 'Purchase of hygiene essentials',
          order_id: razorpayOrder.id,
          handler: async function (response: any) {
            try {
              await apiRequest('/api/payments/verify', 'POST', {
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              await clearCart();
              alert('Payment successful! Order placed.');
              navigate('/');
            } catch (err: any) {
              alert(`Payment verification failed: ${err.message}`);
            }
          },
          prefill: {
            name: shipping.fullName,
            contact: shipping.phone,
          },
          theme: {
            color: '#44D62C',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (error: any) {
      alert(`Checkout failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>Payment & summary</h1>
      <p className="mt-2 text-sm text-[#6f6f6f]">Review your shipping details and order before placing the order.</p>

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

        <div className="flex gap-3">
          <Button className="px-6 py-3" onClick={() => navigate(-1)} disabled={loading}>
            Back
          </Button>
          <Button className="px-6 py-3" onClick={placeOrder} disabled={loading || cart.length === 0}>
            {loading ? 'Processing Order...' : 'Place order & Pay'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
