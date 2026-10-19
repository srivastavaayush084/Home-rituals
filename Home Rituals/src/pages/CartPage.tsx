import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function CartPage() {
  const { cart, removeFromCart } = useApp();

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h1 className="text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>Your cart</h1>
        <p className="mt-8 text-[#6f6f6f]">Your cart is empty.</p>
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl sm:text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3.5">
          {cart.map((item) => (
            <div key={item.productId} className="flex items-center justify-between rounded-[8px] border border-black/10 bg-white p-4 sm:p-5 shadow-2xs">
              <div>
                <p className="font-semibold text-[#242424] text-base">{item.product.name}</p>
                <p className="mt-1 text-xs text-[#6f6f6f]">Qty {item.quantity} • ₹{item.product.price} each</p>
              </div>
              <button
                type="button"
                onClick={() => removeFromCart(item.productId)}
                className="text-xs font-semibold text-stone-500 hover:text-red-600 transition p-2 cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-black">Summary</p>
          <div className="mt-5 space-y-2.5 text-sm text-[#5f5f5f]">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-medium text-[#242424]">₹{subtotal}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span className="text-[#0B8F3C] font-semibold">Free</span></div>
          </div>
          <div className="mt-5 flex justify-between border-t border-black/10 pt-4 text-base font-bold text-[#242424]">
            <span>Total</span>
            <span className="text-xl">₹{total}</span>
          </div>
          <Button to="/checkout" className="mt-6 w-full">Proceed to checkout</Button>
        </Card>
      </div>
    </div>
  );
}

