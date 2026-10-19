import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Heart, Star, MessageSquarePlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Product } from '../../data/content';
import { ReviewModal } from '../reviews/ReviewModal';

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

  return (
    <>
      <motion.article
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={() => openQuickView(product)}
        className={`group relative cursor-pointer overflow-hidden rounded-[8px] border border-[#EAEAEA] bg-white p-4 shadow-2xs transition-all duration-200 hover:shadow-md hover:border-[#223229]/20 ${className}`}
      >
        <div className="relative">
          <div className="relative overflow-hidden rounded-[6px] bg-[#f7f7f5] p-3">
            <img
              src={product.image}
              alt={product.name}
              className="aspect-square w-full rounded-[4px] object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />

            {product.badge ? (
              <span className="absolute left-4 top-4 rounded-[4px] bg-[#44D62C] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#111] shadow-2xs">
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
              className={`absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-[6px] border border-black/10 bg-white/95 text-[#111827] shadow-2xs backdrop-blur transition-all duration-200 hover:border-[#44D62C] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8F3C] ${
                isWishlisted ? 'text-black' : 'text-[#111827]'
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
              className="absolute inset-0 z-10 flex items-center justify-center rounded-[6px] bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/15 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-white/95 px-3.5 py-2 text-xs font-semibold text-[#111827] shadow-sm backdrop-blur">
                <Eye size={13} /> Quick view
              </span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="min-h-[2.8rem]">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#111827] group-hover:text-[#0B8F3C] transition-colors">
              {product.name}
            </h3>
          </div>

          <div className="h-px w-full bg-[#EAEAEA]" />

          {/* Rating & Write Review button */}
          <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280]">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 text-[#f4b942]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={12}
                    className={
                      reviewsCount > 0 && index < Math.round(currentRating)
                        ? 'fill-[#f4b942] text-[#f4b942]'
                        : 'text-stone-300'
                    }
                  />
                ))}
              </div>
              <span className="font-semibold text-[#111827]">
                {reviewsCount > 0 ? currentRating.toFixed(1) : 'New'}
              </span>
              <span className="text-[11px] text-stone-500">
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
              className="inline-flex items-center gap-1 rounded-[4px] border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-medium text-stone-700 shadow-2xs transition hover:border-[#44D62C] hover:bg-emerald-50 hover:text-[#0B8F3C]"
            >
              <MessageSquarePlus size={12} />
              <span>Review</span>
            </button>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-[#111827]">₹{product.price}</p>
              {product.originalPrice ? (
                <p className="text-sm text-[#6B7280] line-through">₹{product.originalPrice}</p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAddToCart(product);
            }}
            className="flex h-11 w-full items-center justify-center rounded-[6px] bg-[#44D62C] text-sm font-semibold tracking-wide text-[#111] shadow-2xs transition-all duration-200 hover:bg-[#3bc224] hover:shadow-xs active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8F3C] cursor-pointer"
          >
            Add To Box
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

