import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../utils/apiClient';
import { Button } from '../components/ui/Button';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    image: string;
  };
}

interface OrderDetails {
  id: string;
  fullName: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string | null;
  phone: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
}

export function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrderDetails() {
      if (!orderId) return;
      try {
        setLoading(true);
        const response = await apiRequest<OrderDetails>(`/api/orders/${orderId}`);
        // Handle standard wrapper from API
        if (response && (response as any).data) {
          setOrder((response as any).data);
        } else {
          setOrder(response);
        }
      } catch (err: any) {
        console.error('Failed to load order details:', err);
        setError(err.message || 'Failed to retrieve order confirmation details.');
      } finally {
        setLoading(false);
      }
    }
    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#44D62C] border-t-transparent"></div>
        <p className="mt-4 text-sm font-medium text-[#6f6f6f]">Confirming order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 border border-red-100">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Unable to Load Order
        </h2>
        <p className="mt-2 text-[#6f6f6f]">{error || 'Order was processed but confirmation could not be generated.'}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/shop">
            <Button>Continue Shopping</Button>
          </Link>
          <Link to="/profile">
            <Button variant="secondary">Go to Profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Visual Success Header */}
      <div className="text-center">
        <div className="relative inline-flex">
          {/* Animated rings for premium feel */}
          <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-[#44D62C]/10 opacity-75"></span>
          <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#44D62C] text-white shadow-lg shadow-[#44D62C]/30">
            <svg className="h-10 w-10 animate-[bounce_1s_ease-in-out_1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h1 className="mt-6 text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Order Confirmed!
        </h1>
        <p className="mt-2 text-[#5f5f5f]">
          Thank you for shopping with us, <span className="font-semibold text-black">{order.fullName}</span>. We've received your payment.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {/* Left Hand Card: Order Info & Items */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#242424]">Order details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6f6f6f]">Order Number:</span>
                <span className="font-mono font-medium text-black">#{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6f6f6f]">Status:</span>
                <span className="inline-flex items-center rounded-full bg-[#44D62C]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0B8F3C]">
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6f6f6f]">Payment Status:</span>
                <span className="inline-flex items-center rounded-full bg-[#44D62C]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0B8F3C]">
                  {order.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between border-t border-black/5 pt-3">
                <span className="font-medium text-[#242424]">Amount Paid:</span>
                <span className="font-bold text-[#0B8F3C] text-lg">₹{order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#242424]">Items purchased</h2>
            <div className="mt-4 divide-y divide-black/5">
              {order.items && order.items.map((item) => (
                <div key={item.id} className="flex py-3 first:pt-0 last:pb-0">
                  {item.product?.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-12 w-12 rounded-lg object-cover border border-black/5"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-100 border border-black/5 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Box</span>
                    </div>
                  )}
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-semibold text-[#242424]">{item.product?.name || 'Home Rituals Product'}</p>
                    <p className="text-xs text-[#6f6f6f]">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-sm font-medium text-black">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Hand Card: Delivery Address & Summary */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#242424]">Shipping address</h2>
            <div className="mt-4 text-sm text-[#333] space-y-1">
              <p className="font-semibold text-black">{order.fullName}</p>
              <p>{order.address1}</p>
              {order.address2 && <p>{order.address2}</p>}
              {order.landmark && <p className="text-xs text-[#6f6f6f]">Landmark: {order.landmark}</p>}
              <p>{order.city}, {order.state} - {order.postalCode}</p>
              <p className="text-[#6f6f6f]">{order.country}</p>
              <p className="mt-3 font-medium text-black border-t border-black/5 pt-2">
                Phone: {order.phone}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-[#fdfefc] p-6 text-center border-dashed">
            <h3 className="font-semibold text-[#0B8F3C] text-sm uppercase tracking-wider">Next steps</h3>
            <p className="mt-2 text-xs text-[#6f6f6f] leading-relaxed">
              We have dispatched your order confirmation email. Once our logistics team prepares the package, we'll notify you with courier tracking information.
            </p>
          </div>
        </div>
      </div>

      {/* Button Actions */}
      <div className="mt-12 flex flex-col sm:flex-row justify-center gap-3">
        <Link to="/shop" className="w-full sm:w-auto">
          <Button className="w-full px-8 py-3 rounded-full">
            Continue Shopping
          </Button>
        </Link>
        <Link to="/profile" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full px-8 py-3 rounded-full border-black/10 hover:bg-black/5">
            View My Orders
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default OrderSuccessPage;
