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
      <h1 className="text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {cart.map((item) => (
            <Card key={item.productId} className="flex items-center justify-between p-5">
              <div>
                <p className="font-semibold text-[#242424]">{item.product.name}</p>
                <p className="mt-1 text-sm text-[#6f6f6f]">Qty {item.quantity} • ₹{item.product.price}</p>
              </div>
              <Button variant="ghost" onClick={() => removeFromCart(item.productId)}>Remove</Button>
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-black">Summary</p>
          <div className="mt-6 space-y-3 text-sm text-[#5f5f5f]">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
          </div>
          <div className="mt-6 flex justify-between border-t border-black/5 pt-4 text-lg font-semibold text-[#242424]"><span>Total</span><span>₹{total}</span></div>
          <Button to="/checkout" className="mt-6 w-full">Proceed to checkout</Button>
        </Card>
      </div>
    </div>
  );
}

