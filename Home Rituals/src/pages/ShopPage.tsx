import { ChevronRight } from 'lucide-react';
import { ProductCard } from '../components/ui/ProductCard';
import { useApp } from '../context/AppContext';

export function ShopPage() {
  const { products, addToCart, toggleWishlist, wishlistIds, isLoadingProducts } = useApp();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-black">Shop</p>
        <h1 className="mt-2 text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>
          The complete ritual edit
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-[#6f6f6f]">
          Discover plant-powered essentials designed for calm kitchens, soft linens, and beautifully considered daily routines.
        </p>
      </div>

      <div>
        <p className="mb-6 text-sm text-[#5f5f5f]">Showing {products.length} of 30 products</p>

        {isLoadingProducts ? (
          <div className="py-20 text-center text-[#6f6f6f]">Loading shop items...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlistIds.some((id: any) => String(id) === String(product.id))}
                onToggleWishlist={toggleWishlist}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          {['1', '2', '3'].map((page) => (
            <button key={page} className={`rounded-full px-4 py-2 text-sm ${page === '1' ? 'bg-[#44D62C] text-white' : 'bg-white text-[#242424] shadow-sm'}`}>
              {page}
            </button>
          ))}
          <button className="rounded-full border border-black/5 bg-white p-2 text-black shadow-sm">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShopPage;
