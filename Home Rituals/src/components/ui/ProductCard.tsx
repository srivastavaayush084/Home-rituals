import { motion } from 'framer-motion';
import { Eye, Heart, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Product } from '../../data/content';

type ProductCardProps = {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (productId: number) => void;
  onAddToCart: (product: Product) => void;
  className?: string;
};

export function ProductCard({ product, isWishlisted, onToggleWishlist, onAddToCart, className = '' }: ProductCardProps) {
  const { openQuickView } = useApp();

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={() => openQuickView(product)}
      className={`group relative cursor-pointer overflow-hidden rounded-[20px] border border-[#EAEAEA] bg-white p-4 shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] ${className}`}
    >
      <div className="relative">
        <div className="relative overflow-hidden rounded-[16px] bg-[#f7f7f5] p-3">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full rounded-[12px] object-cover transition duration-300 group-hover:scale-105"
          />

          {product.badge ? (
            <span className="absolute left-6 top-6 rounded-full bg-[#44D62C] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg">
              {product.badge}
            </span>
          ) : null}

          <button
            type="button"
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={isWishlisted}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleWishlist(product.id);
            }}
            className={`absolute right-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#111827] shadow-lg backdrop-blur transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
              isWishlisted ? 'text-black' : 'text-[#111827]'
            }`}
          >
            <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            aria-label={`Quick view ${product.name}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openQuickView(product);
            }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-[16px] bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/10 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#111827] shadow-lg">
              <Eye size={14} /> Quick view
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="min-h-[3.2rem]">
          <h3 className="line-clamp-2 text-[18px] font-[700] leading-6 text-[#111827] sm:text-[24px]">
            {product.name}
          </h3>
        </div>

        <div className="h-px w-full bg-[#EAEAEA]" />

        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <div className="flex items-center gap-1 text-[#f4b942]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={14} fill="currentColor" />
            ))}
          </div>
          <span className="font-medium text-[#111827]">{(Number(product.rating) || 5.0).toFixed(1)}</span>
          <span>({(product as any).reviewsCount ?? product.reviews ?? 0})</span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            {product.originalPrice ? (
              <p className="text-[20px] text-[#6B7280] line-through">₹{product.originalPrice}</p>
            ) : null}
            <p className="text-[32px] font-bold leading-none text-[#111827]">₹{product.price}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAddToCart(product);
          }}
          className="flex h-14 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#44D62C_0%,#44D62C_100%)] text-[20px] font-semibold text-[#111] shadow-[0_10px_24px_rgba(41,211,0,0.25)] transition-all duration-300 hover:scale-[1.02] hover:bg-[linear-gradient(90deg,#44D62C_0%,#44D62C_100%)] hover:shadow-[0_14px_30px_rgba(41,211,0,0.35)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#44D62C]"
        >
          Add To Box
        </button>
      </div>
    </motion.article>
  );
}
