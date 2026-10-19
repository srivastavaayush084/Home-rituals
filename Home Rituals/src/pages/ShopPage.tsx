import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProductCard } from '../components/ui/ProductCard';
import { useApp } from '../context/AppContext';

export function ShopPage() {
  const { products, addToCart, toggleWishlist, wishlistIds, isLoadingProducts, isFallbackMode, refreshProducts } = useApp();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {isFallbackMode && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-xs text-amber-800 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>Displaying offline catalog preview. Connect to the API server for live inventory and pricing.</span>
          </div>
          <button
            onClick={() => refreshProducts()}
            className="ml-3 font-semibold underline hover:text-amber-950 transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[10px] border border-stone-200/80 bg-stone-100 shadow-sm mb-12 aspect-[16/9] max-h-[440px] w-full flex items-center justify-center"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover rounded-[8px]"
        >
          <source src="/Animation1.mp4" type="video/mp4" />
          <source src="/animation1.mp4" type="video/mp4" />
          <source src="/Animation 1.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </motion.div>

      <div>
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
      </div>
    </div>
  );
}

export default ShopPage;
