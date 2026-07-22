import { ProductCard } from '../components/ui/ProductCard';
import { useApp } from '../context/AppContext';

export function WishlistPage() {
  const { products, addToCart, toggleWishlist, wishlistIds } = useApp();

  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>Your wishlist</h1>
      
      {wishlistedProducts.length === 0 ? (
        <p className="mt-8 text-[#6f6f6f]">Your wishlist is currently empty. Start adding some essentials!</p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {wishlistedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={true}
              onToggleWishlist={toggleWishlist}
              onAddToCart={addToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default WishlistPage;
