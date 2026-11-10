import { Sparkles, ArrowUpDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, useMemo } from 'react';
import { ProductCard } from '../components/ui/ProductCard';
import { useApp } from '../context/AppContext';

export function ShopPage() {
  const {
    products,
    addToCart,
    toggleWishlist,
    wishlistIds,
    isLoadingProducts,
    isFallbackMode,
    refreshProducts,
  } = useApp();
  const bannerVideoRef = useRef<HTMLVideoElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating-desc'>('featured');

  useEffect(() => {
    const v = bannerVideoRef.current;
    if (!v) return;

    v.defaultMuted = true;
    v.muted = true;
    v.playsInline = true;

    const tryPlay = () => {
      v.muted = true;
      v.play().catch(() => {});
    };

    tryPlay();

    const onUserInteraction = () => {
      if (v.paused) {
        tryPlay();
      }
    };

    window.addEventListener('touchstart', onUserInteraction, { once: true, passive: true });
    window.addEventListener('click', onUserInteraction, { once: true, passive: true });
    window.addEventListener('scroll', onUserInteraction, { once: true, passive: true });

    return () => {
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('click', onUserInteraction);
      window.removeEventListener('scroll', onUserInteraction);
    };
  }, []);

  // Extract dynamic categories from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (!p.category) return;
      if (typeof p.category === 'string') set.add(p.category);
      else if (typeof p.category === 'object' && p.category.name) set.add(p.category.name);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((p) => {
      if (selectedCategory === 'All') return true;
      const catName = typeof p.category === 'string' ? p.category : p.category?.name;
      return catName === selectedCategory;
    });

    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating-desc') {
      result = [...result].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }

    return result;
  }, [products, selectedCategory, sortBy]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {isFallbackMode && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-700 flex-shrink-0" />
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

      {/* Video Banner Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E8E4DC] bg-[#0F1F17] shadow-sm mb-10 aspect-[16/9] max-h-[440px] w-full flex items-center justify-center"
      >
        <video
          ref={(el) => {
            bannerVideoRef.current = el;
            if (el) {
              el.muted = true;
              el.defaultMuted = true;
            }
          }}
          src="/Animation1.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            el.muted = true;
            el.play().catch(() => {});
          }}
          onCanPlay={(e) => {
            const el = e.currentTarget;
            el.muted = true;
            el.play().catch(() => {});
          }}
          className="h-full w-full object-cover rounded-2xl sm:rounded-3xl"
        >
          <source src="/Animation1.mp4?v=3" type="video/mp4" />
          <source src="/Animation1.mp4" type="video/mp4" />
          <source src="/animation1.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </motion.div>

      {/* Header & Controls Bar */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E8E4DC] pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#2D5A43]">
            Curated Formulations
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-serif font-bold text-[#14291D]">
            Botanical Rituals
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5C6860]">
            Showing {filteredAndSortedProducts.length} conscious home care {filteredAndSortedProducts.length === 1 ? 'essential' : 'essentials'}
          </p>
        </div>

        {/* Category Pills & Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F5F1EA] p-1 rounded-xl border border-[#E8E4DC]">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#14291D] text-[#FBF9F5] shadow-xs'
                    : 'text-[#5C6860] hover:text-[#14291D] hover:bg-white/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Menu */}
          <div className="flex items-center gap-2 border border-[#E8E4DC] bg-white rounded-xl px-3 py-1.5 text-xs text-[#14291D] shadow-xs">
            <ArrowUpDown size={13} className="text-[#2D5A43]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent outline-none cursor-pointer font-medium text-xs text-[#14291D]"
            >
              <option value="featured">Featured Rituals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div>
        {isLoadingProducts ? (
          <div className="py-24 text-center text-[#5C6860]">Loading conscious formulations...</div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-sm text-[#5C6860]">No essentials match the selected filter.</p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="mt-3 text-xs font-semibold text-[#2D5A43] underline hover:text-[#14291D] cursor-pointer"
            >
              Reset to All Formulations
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedProducts.map((product) => (
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
