import { Sparkles, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'All';
  const selectedSort = searchParams.get('sort') || 'featured';

  const bannerVideoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc] = useState(() => `/Animation1.mp4?v=${Date.now()}`);

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

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const cat = typeof p.category === 'object' && (p.category as any)?.name ? (p.category as any).name : p.category;
      if (cat && typeof cat === 'string') set.add(cat);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const handleCategoryChange = (category: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (category === 'All') {
      nextParams.delete('category');
    } else {
      nextParams.set('category', category);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleSortChange = (sortVal: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (sortVal === 'featured') {
      nextParams.delete('sort');
    } else {
      nextParams.set('sort', sortVal);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const displayProducts = useMemo(() => {
    let list = [...products];
    if (selectedCategory !== 'All') {
      list = list.filter((p) => {
        const cat = typeof p.category === 'object' && (p.category as any)?.name ? (p.category as any).name : p.category;
        return cat === selectedCategory;
      });
    }
    if (selectedSort === 'price-asc') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (selectedSort === 'price-desc') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (selectedSort === 'rating') {
      list.sort((a, b) => Number((b as any).rating || 0) - Number((a as any).rating || 0));
    }
    return list;
  }, [products, selectedCategory, selectedSort]);

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

      {/* Featured Video Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[32px] border border-stone-200/80 bg-stone-100 shadow-sm mb-10 aspect-[16/9] max-h-[460px] w-full flex items-center justify-center"
      >
        <video
          ref={(el) => {
            bannerVideoRef.current = el;
            if (el) {
              el.muted = true;
              el.defaultMuted = true;
            }
          }}
          src={videoSrc}
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
          className="h-full w-full object-cover rounded-[32px]"
        >
          <source src={videoSrc} type="video/mp4" />
          <source src="/Animation1.mp4" type="video/mp4" />
          <source src="/animation1.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </motion.div>

      {/* Filter and Sort Control Bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-5">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium tracking-wide transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0B8F3C] text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <SlidersHorizontal size={14} className="text-stone-500" />
          <select
            value={selectedSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm focus:border-[#0B8F3C] focus:outline-none cursor-pointer"
          >
            <option value="featured">Featured Curations</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div>
        {isLoadingProducts ? (
          <div className="py-20 text-center text-[#6f6f6f]">Loading shop items...</div>
        ) : displayProducts.length === 0 ? (
          <div className="py-20 text-center text-[#6f6f6f]">
            No rituals found matching your selection.{' '}
            <button
              onClick={() => handleCategoryChange('All')}
              className="text-[#0B8F3C] underline font-medium ml-1"
            >
              View all products
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {displayProducts.map((product) => (
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
