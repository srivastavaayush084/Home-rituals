import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Heart, Star, MessageSquarePlus, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Product } from '../../data/content';
import { ReviewModal } from '../reviews/ReviewModal';
import { trackAddToCart } from '../../utils/analytics';

type ProductCardProps = {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (productId: number) => void;
  onAddToCart: (product: Product) => void;
  className?: string;
};

export function ProductCard({ product, isWishlisted, onToggleWishlist, onAddToCart, className = '' }: ProductCardProps) {
  const { openQuickView } = useApp();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  const initialCount = Number((product as any).reviewsCount ?? product.reviews ?? 0);
  const [reviewsCount, setReviewsCount] = useState<number>(initialCount);
  const [currentRating, setCurrentRating] = useState<number>(Number(product.rating) || 0);

  useEffect(() => {
    try {
      const storageKey = `home-rituals-reviews-${product.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const totalCount = parsed.length;
          setReviewsCount(totalCount);
          const sum = parsed.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0);
          setCurrentRating(parseFloat((sum / totalCount).toFixed(1)));
        }
      }
    } catch {
      // Ignore
    }
  }, [product.id]);

  const handleReviewSubmitted = (newReview: any) => {
    setReviewsCount((prev) => {
      const nextCount = prev + 1;
      const nextRating = ((currentRating * prev) + (Number(newReview.rating) || 5)) / nextCount;
      setCurrentRating(parseFloat(nextRating.toFixed(1)));
      return nextCount;
    });
  };

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <>
      <motion.article
        whileHover={{ y: -4 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={() => openQuickView(product)}
        className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(20,41,29,0.04)] transition-all duration-300 hover:border-[#D5CFC3] hover:shadow-[0_12px_32px_rgba(20,41,29,0.08)] ${className}`}
      >
        <div className="relative">
          <div className="relative overflow-hidden rounded-xl bg-[#F5F1EA] p-2">
            <img
              src={product.image}
              alt={product.name}
              className="aspect-square w-full rounded-lg object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              loading="lazy"
            />

            {product.badge ? (
              <span className="absolute left-4 top-4 rounded-full bg-[#14291D]/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FBF9F5] shadow-sm backdrop-blur-sm border border-[#C5A880]/30">
                {product.badge}
              </span>
            ) : null}

            {discountPercent > 0 && !product.badge ? (
              <span className="absolute left-4 top-4 rounded-full bg-[#2D5A43]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#FBF9F5] shadow-sm backdrop-blur-sm">
                {discountPercent}% OFF
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
              className={`absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A43] ${
                isWishlisted ? 'text-red-600' : 'text-[#14291D] hover:text-red-600'
              }`}
            >
              <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              aria-label={`Quick view ${product.name}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openQuickView(product);
              }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/15 opacity-0 backdrop-blur-[2px] transition-all duration-200 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#14291D] shadow-md">
                <Eye size={13} /> Quick view
              </span>
            </button>
          </div>
        </div>

        <div className="mt-3.5 flex flex-col gap-2.5">
          <div className="min-h-[2.8rem]">
            <h3 className="line-clamp-2 text-sm sm:text-base font-semibold text-[#14291D] leading-snug">
              {product.name}
            </h3>
          </div>

          <div className="h-px w-full bg-[#F0ECE4]" />

          {/* Rating & Write Review button */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 text-[#C5A880]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={12}
                    className={
                      reviewsCount > 0 && index < Math.round(currentRating)
                        ? 'fill-[#C5A880] text-[#C5A880]'
                        : 'text-stone-300'
                    }
                  />
                ))}
              </div>
              <span className="font-medium text-[#14291D]">
                {reviewsCount > 0 ? currentRating.toFixed(1) : 'New'}
              </span>
              <span className="text-[11px] text-[#5C6860]">
                ({reviewsCount})
              </span>
            </div>

            <button
              type="button"
              aria-label={`Add review for ${product.name}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsReviewModalOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-[#E8E4DC] bg-[#F5F1EA] px-2.5 py-0.5 text-[11px] font-medium text-[#2D5A43] transition hover:bg-[#EAE4D7] hover:border-[#D5CFC3]"
            >
              <MessageSquarePlus size={11} />
              <span>Review</span>
            </button>
          </div>

          <div className="flex items-baseline justify-between pt-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#14291D]">
                ₹{product.price}
              </span>
              {product.originalPrice ? (
                <span className="text-xs text-[#8A968F] line-through">
                  ₹{product.originalPrice}
                </span>
              ) : null}
            </div>
            {discountPercent > 0 ? (
              <span className="text-[11px] font-medium text-[#2D5A43] bg-[#2D5A43]/10 px-2 py-0.5 rounded-md">
                Save ₹{product.originalPrice! - product.price}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAddToCart(product);
              trackAddToCart(product, 1);
            }}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#14291D] text-xs sm:text-sm font-semibold tracking-wide text-[#FBF9F5] shadow-sm transition-all duration-200 hover:bg-[#203D2D] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A43]"
          >
            <ShoppingBag size={14} />
            <span>Add to Bag</span>
          </button>
        </div>
      </motion.article>

      {/* Review Workflow Modal */}
      <ReviewModal
        product={product}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
}
