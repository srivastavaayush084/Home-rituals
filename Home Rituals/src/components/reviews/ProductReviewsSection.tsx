import React, { useState, useEffect, useMemo } from 'react';
import { Star, CheckCircle, Image as ImageIcon, MessageSquare, Play, Sparkles } from 'lucide-react';
import { apiRequest } from '../../utils/apiClient';
import { ReviewModal } from './ReviewModal';
import { MediaLightbox, type MediaItem } from './MediaLightbox';

export interface CustomerReview {
  id: string | number;
  author: string;
  title: string;
  text: string;
  rating: number;
  isApproved?: boolean;
  verifiedPurchase?: boolean;
  images?: string[];
  videos?: string[];
  createdAt: string;
}

interface ProductReviewsSectionProps {
  product: {
    id: string | number;
    name: string;
    image?: string;
    price?: number;
    slug?: string;
    reviewsCount?: number;
    rating?: number;
  };
  onReviewsUpdated?: (count: number, avgRating: number) => void;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  onReviewsUpdated,
}) => {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'media' | '5' | '4' | '3'>('all');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<MediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchReviews = async () => {
    setLoading(true);
    let combinedReviews: CustomerReview[] = [];

    // 1. Fetch from server API
    try {
      const productIdOrSlug = product.id || product.slug;
      const res = await apiRequest<any>(`/api/reviews/product/${productIdOrSlug}`);
      const serverItems = Array.isArray(res) ? res : (res?.items || res?.data || []);
      combinedReviews = [...serverItems];
    } catch (err) {
      console.warn('Could not fetch server reviews, using local repository:', err);
    }

    // 2. Fetch locally stored reviews for this product
    try {
      const storageKey = `home-rituals-reviews-${product.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const localList: CustomerReview[] = JSON.parse(stored);
        localList.forEach((localRev) => {
          if (!combinedReviews.some((r) => String(r.id) === String(localRev.id))) {
            combinedReviews.unshift(localRev);
          }
        });
      }
    } catch {
      // Ignore
    }

    setReviews(combinedReviews);
    setLoading(false);

    if (onReviewsUpdated) {
      const count = combinedReviews.length;
      const avg = count > 0
        ? combinedReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / count
        : 0;
      onReviewsUpdated(count, parseFloat(avg.toFixed(1)));
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [product.id, product.slug]);

  const handleReviewSubmitted = (newRev: CustomerReview) => {
    setReviews((prev) => [newRev, ...prev]);
    const updatedReviews = [newRev, ...reviews];
    if (onReviewsUpdated) {
      const count = updatedReviews.length;
      const avg = updatedReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / count;
      onReviewsUpdated(count, parseFloat(avg.toFixed(1)));
    }
  };

  // Rating stats
  const totalReviews = reviews.length;
  const averageRating = useMemo(() => {
    if (totalReviews === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return parseFloat((sum / totalReviews).toFixed(1));
  }, [reviews, totalReviews]);

  // Breakdown counts
  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  // All customer media (photos + videos)
  const allCustomerMedia = useMemo<MediaItem[]>(() => {
    const media: MediaItem[] = [];
    reviews.forEach((r) => {
      if (Array.isArray(r.images)) {
        r.images.forEach((img) => media.push({ type: 'image', url: img, title: r.title }));
      }
      if (Array.isArray(r.videos)) {
        r.videos.forEach((vid) => media.push({ type: 'video', url: vid, title: r.title }));
      }
    });
    return media;
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (activeFilter === 'media') {
        return (r.images && r.images.length > 0) || (r.videos && r.videos.length > 0);
      }
      if (activeFilter === '5') return r.rating === 5;
      if (activeFilter === '4') return r.rating === 4;
      if (activeFilter === '3') return r.rating === 3;
      return true;
    });
  }, [reviews, activeFilter]);

  const openLightbox = (mediaArray: MediaItem[], index = 0) => {
    setLightboxMedia(mediaArray);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div id="product-reviews-section" className="mt-16 border-t border-stone-200 pt-12">
      {/* Header & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#44D62C]">
            Verified Customer Feedback
          </p>
          <h3 className="mt-1 text-3xl font-serif font-bold text-stone-900">
            Customer Reviews
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-[#44D62C] hover:bg-[#3ec428] px-5 py-2.5 text-sm font-semibold text-[#111827] shadow-xs transition-all"
        >
          <Star size={16} fill="currentColor" /> Write a Review
        </button>
      </div>

      {/* Ratings Overview Card */}
      <div className="grid gap-6 rounded-[8px] border border-stone-200 bg-stone-50/70 p-6 sm:p-8 md:grid-cols-[240px_1fr]">
        {/* Score & stars */}
        <div className="flex flex-col items-center justify-center border-b border-stone-200 pb-6 md:border-b-0 md:border-r md:pr-8 md:pb-0">
          <div className="text-5xl font-extrabold text-stone-900 font-serif">
            {totalReviews > 0 ? averageRating.toFixed(1) : '0.0'}
          </div>
          <div className="mt-2 flex items-center gap-1 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={18}
                className={i < Math.round(averageRating) && totalReviews > 0 ? 'fill-current' : 'text-stone-300'}
              />
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-stone-500">
            Based on {totalReviews} real {totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Breakdown bars */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = (ratingCounts as any)[stars] || 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-semibold text-stone-700">{stars} Stars</span>
                <div className="h-2 flex-1 overflow-hidden rounded-[3px] bg-stone-200">
                  <div
                    className="h-full rounded-[3px] bg-amber-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-10 text-right text-stone-500 font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Photos & Videos Reel (if any exist) */}
      {allCustomerMedia.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-[#44D62C]" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-stone-800">
              Customer Photos & Videos ({allCustomerMedia.length})
            </h4>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {allCustomerMedia.map((item, idx) => (
              <div
                key={idx}
                onClick={() => openLightbox(allCustomerMedia, idx)}
                className="group relative h-24 w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded-[6px] border border-stone-200 bg-stone-100 shadow-2xs transition hover:scale-105"
              >
                {item.type === 'video' ? (
                  <div className="relative h-full w-full bg-black flex items-center justify-center">
                    <video src={item.url} className="h-full w-full object-cover opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={20} className="fill-white text-white drop-shadow" />
                    </div>
                  </div>
                ) : (
                  <img src={item.url} alt="Review attachment" className="h-full w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {totalReviews > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
          <button
            onClick={() => setActiveFilter('all')}
            className={`rounded-[4px] px-3.5 py-1.5 text-xs font-semibold transition ${
              activeFilter === 'all'
                ? 'bg-[#44D62C] text-[#111827] shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All ({totalReviews})
          </button>
          {allCustomerMedia.length > 0 && (
            <button
              onClick={() => setActiveFilter('media')}
              className={`flex items-center gap-1.5 rounded-[4px] px-3.5 py-1.5 text-xs font-semibold transition ${
                activeFilter === 'media'
                  ? 'bg-[#44D62C] text-[#111827] shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <ImageIcon size={13} /> With Photos & Videos ({allCustomerMedia.length})
            </button>
          )}
          {ratingCounts[5] > 0 && (
            <button
              onClick={() => setActiveFilter('5')}
              className={`rounded-[4px] px-3.5 py-1.5 text-xs font-semibold transition ${
                activeFilter === '5'
                  ? 'bg-[#44D62C] text-[#111827] shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              5 Stars ({ratingCounts[5]})
            </button>
          )}
        </div>
      )}

      {/* Reviews List or Empty state */}
      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-stone-500">
            Loading customer reviews...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-stone-300 bg-stone-50/60 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[8px] bg-white text-stone-400 shadow-2xs border border-stone-200">
              <MessageSquare size={24} />
            </div>
            <h4 className="mt-3 text-lg font-bold text-stone-900">
              {totalReviews === 0
                ? 'No Customer Reviews Yet'
                : 'No reviews match your selected filter'}
            </h4>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
              {totalReviews === 0
                ? 'Be the first to share your thoughts and help others make the right choice!'
                : 'Try selecting a different filter above to view all reviews.'}
            </p>
            {totalReviews === 0 && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-[6px] bg-[#44D62C] hover:bg-[#3ec428] px-5 py-2.5 text-xs font-semibold text-[#111827] shadow-xs transition"
              >
                <Star size={14} fill="currentColor" /> Be First to Review
              </button>
            )}
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const revMedia: MediaItem[] = [
              ...(rev.images || []).map((url) => ({ type: 'image' as const, url, title: rev.title })),
              ...(rev.videos || []).map((url) => ({ type: 'video' as const, url, title: rev.title })),
            ];

            return (
              <div
                key={rev.id}
                className="rounded-[8px] border border-stone-200 bg-white p-6 shadow-xs transition hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Star Rating */}
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={15}
                          className={i < rev.rating ? 'fill-current' : 'text-stone-300'}
                        />
                      ))}
                    </div>

                    <span className="font-bold text-stone-900 text-sm">{rev.title}</span>
                  </div>

                  <span className="text-[11px] text-stone-500">
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    }) : 'Recent'}
                  </span>
                </div>

                {/* Author & Verified Buyer */}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-800">{rev.author}</span>
                  {rev.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B8F3C]">
                      <CheckCircle size={12} /> Verified Buyer
                    </span>
                  )}
                </div>

                {/* Review Body */}
                <p className="mt-3 text-sm leading-relaxed text-stone-700 whitespace-pre-line">
                  {rev.text}
                </p>

                {/* Attached Photos & Videos */}
                {revMedia.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {revMedia.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        onClick={() => openLightbox(revMedia, mIdx)}
                        className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-[6px] border border-stone-200 bg-stone-100 shadow-2xs transition hover:scale-105"
                      >
                        {m.type === 'video' ? (
                          <div className="relative h-full w-full bg-black flex items-center justify-center">
                            <video src={m.url} className="h-full w-full object-cover opacity-80" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Play size={18} className="fill-white text-white drop-shadow" />
                            </div>
                            <span className="absolute bottom-1 right-1 rounded-[3px] bg-black/70 px-1 py-0.5 text-[8px] font-bold text-white uppercase">
                              Video
                            </span>
                          </div>
                        ) : (
                          <img
                            src={m.url}
                            alt="Customer photo attachment"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReviewSubmitted={handleReviewSubmitted}
      />

      {/* Media Lightbox */}
      <MediaLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        media={lightboxMedia}
        initialIndex={lightboxIndex}
      />
    </div>
  );
};
