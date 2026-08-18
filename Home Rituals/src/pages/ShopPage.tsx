import { ChevronRight, Sparkles, Leaf, Check, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProductCard } from '../components/ui/ProductCard';
import { useApp } from '../context/AppContext';

export function ShopPage() {
  const { products, addToCart, toggleWishlist, wishlistIds, isLoadingProducts } = useApp();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[32px] border border-stone-200 bg-gradient-to-br from-[#FAF8F5] via-[#F3EFE9] to-[#EAE4DA] p-8 md:p-12 lg:p-16 mb-12 shadow-sm"
      >
        {/* Abstract background decorative elements */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#44D62C]/5 blur-3xl" />
        <div className="absolute right-1/4 -bottom-16 h-48 w-48 rounded-full bg-[#0B8F3C]/5 blur-2xl" />

        <div className="relative z-10 grid gap-8 md:grid-cols-[1.1fr_0.9fr] items-center">
          {/* Left Content */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0B8F3C]/20 bg-[#0B8F3C]/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B8F3C]">
              <Leaf size={12} className="text-[#0B8F3C] animate-pulse" />
              <span>Shop The Collection</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-semibold tracking-tight text-stone-900 leading-tight">
              The complete <span className="italic font-serif text-[#0B8F3C] font-normal">ritual</span> edit
            </h1>
            
            <p className="max-w-xl text-xs md:text-sm lg:text-base leading-relaxed text-stone-600">
              Discover plant-powered essentials designed for calm kitchens, soft linens, and beautifully considered daily routines. Fresh, effective, and simple cleaning for modern spaces.
            </p>

            <div className="pt-2 flex flex-wrap gap-3 text-xs font-semibold text-stone-600">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 shadow-sm border border-stone-100">
                <Check size={12} className="text-[#44D62C]" /> 100% Biodegradable
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 shadow-sm border border-stone-100">
                <Check size={12} className="text-[#44D62C]" /> Chemical-Free Confidence
              </span>
            </div>
          </div>

          {/* Right Content - Elegant Floating Decorative Cards */}
          <div className="hidden md:flex flex-col gap-3 justify-center items-end relative">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full max-w-[280px] bg-white/80 backdrop-blur-md border border-stone-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5"
            >
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-stone-800">Fresh & Restored</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">Deep clean and odor removal</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full max-w-[280px] bg-white/80 backdrop-blur-md border border-stone-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5 mr-6 md:mr-10"
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <Leaf size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-stone-800">Botanical Care</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">Safe for families & pets</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full max-w-[280px] bg-white/80 backdrop-blur-md border border-stone-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5"
            >
              <div className="h-10 w-10 rounded-xl bg-stone-955 text-[#44D62C] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#223229' }}>
                <ShoppingBag size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-stone-800">Everyday Value</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">Concentrated longer lasting formulas</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

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
