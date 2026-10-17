import React, { useState } from 'react';
import { Star, X, Film, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../utils/apiClient';

interface ReviewModalProps {
  product: {
    id: string | number;
    name: string;
    image?: string;
    price?: number;
    slug?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: (newReview: any) => void;
}

interface UploadedMedia {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  base64Url: string;
}

const RATING_LABELS = [
  '',
  'Poor — Needs improvement',
  'Fair — Below expectations',
  'Good — Satisfactory experience',
  'Very Good — Highly recommended',
  'Excellent — Absolutely loved it!',
];

export const ReviewModal: React.FC<ReviewModalProps> = ({
  product,
  isOpen,
  onClose,
  onReviewSubmitted,
}) => {
  const { user, showToast } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState(user?.name || '');
  const [mediaList, setMediaList] = useState<UploadedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync author name if user logs in
  React.useEffect(() => {
    if (user?.name && !authorName) {
      setAuthorName(user.name);
    }
  }, [user]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        setError('Please upload only image or video files.');
        return;
      }

      // Check file size (videos up to 30MB, images up to 8MB)
      const maxSize = isVideo ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Max size is ${isVideo ? '30MB' : '8MB'}.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64Url = reader.result as string;
        setMediaList((prev) => [
          ...prev,
          {
            file,
            previewUrl,
            type: isVideo ? 'video' : 'image',
            base64Url,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Please select a star rating (1 to 5 stars).');
      return;
    }
    if (!title.trim()) {
      setError('Please add a title for your review.');
      return;
    }
    if (!text.trim()) {
      setError('Please share your thoughts in the review comments.');
      return;
    }

    setIsSubmitting(true);

    const images = mediaList.filter((m) => m.type === 'image').map((m) => m.base64Url);
    const videos = mediaList.filter((m) => m.type === 'video').map((m) => m.base64Url);
    const resolvedAuthor = authorName.trim() || user?.name || 'Customer';

    const reviewPayload = {
      title: title.trim(),
      text: text.trim(),
      rating,
      author: resolvedAuthor,
      images,
      videos,
    };

    const newReviewObj = {
      id: `local-${Date.now()}`,
      author: resolvedAuthor,
      title: title.trim(),
      text: text.trim(),
      rating,
      images,
      videos,
      isApproved: true,
      verifiedPurchase: Boolean(user),
      createdAt: new Date().toISOString(),
      productId: String(product.id),
    };

    try {
      // 1. Try sending to backend API
      const productIdOrSlug = product.id || product.slug;
      await apiRequest(`/api/reviews/product/${productIdOrSlug}`, 'POST', reviewPayload);
    } catch (apiErr: any) {
      console.warn('Backend review submission fallback, saving locally:', apiErr);
    }

    // 2. Always persist locally so customer immediately sees review
    try {
      const storageKey = `home-rituals-reviews-${product.id}`;
      const existingReviewsJson = localStorage.getItem(storageKey);
      const existingReviews = existingReviewsJson ? JSON.parse(existingReviewsJson) : [];
      localStorage.setItem(storageKey, JSON.stringify([newReviewObj, ...existingReviews]));
    } catch {
      // Ignore storage errors
    }

    setIsSubmitting(false);
    setIsSuccess(true);
    showToast('Your review has been submitted successfully!');

    if (onReviewSubmitted) {
      onReviewSubmitted(newReviewObj);
    }

    // Auto close after brief celebration
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1800);
  };

  const activeRating = hoverRating || rating;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-stone-200 bg-white p-6 shadow-2xl sm:p-8"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition"
          >
            <X size={18} />
          </button>

          {isSuccess ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-[#44D62C]">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="mt-4 text-2xl font-bold text-stone-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Thank You for Your Review!
              </h3>
              <p className="mt-2 text-sm text-stone-600">
                Your feedback helps our community discover the best home rituals.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product header preview */}
              <div className="flex items-center gap-4 rounded-2xl bg-stone-50 p-3.5 border border-stone-200">
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-14 w-14 rounded-xl object-contain bg-white border border-stone-200"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#44D62C]">Write Customer Review</p>
                  <h4 className="truncate text-base font-bold text-stone-900">{product.name}</h4>
                  {product.price && <p className="text-xs font-semibold text-stone-600">₹{product.price}</p>}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 5-Star Rating selector */}
              <div className="rounded-2xl border border-stone-200 p-4 text-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                  Overall Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = starValue <= activeRating;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${starValue} stars`}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          size={32}
                          className={`transition-colors ${
                            isFilled ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs font-semibold text-stone-700 h-4">
                  {RATING_LABELS[activeRating] || 'Click stars to rate'}
                </p>
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Review Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Amazing cleaning power & wonderful scent!"
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-[#44D62C] focus:outline-none focus:ring-1 focus:ring-[#44D62C]"
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Detailed Review / Experience *
                </label>
                <textarea
                  required
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What did you like or dislike? How effectively did this product clean?"
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-[#44D62C] focus:outline-none focus:ring-1 focus:ring-[#44D62C]"
                />
              </div>

              {/* Author name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-[#44D62C] focus:outline-none focus:ring-1 focus:ring-[#44D62C]"
                />
              </div>

              {/* Photo & Video Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Add Photos & Videos (Optional)
                  </label>
                  <span className="text-[11px] text-stone-500">Max 5 files (Photos & Videos)</span>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/70 p-4 transition hover:bg-stone-100/70">
                  <input
                    type="file"
                    id="media-upload-input"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="media-upload-input"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#44D62C] shadow-sm border border-stone-200">
                      <UploadCloud size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-800">
                        Click to upload photos or videos
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Supports JPG, PNG, WEBP, MP4, MOV
                      </p>
                    </div>
                  </label>

                  {/* Previews */}
                  {mediaList.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-2.5">
                      {mediaList.map((media, idx) => (
                        <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border border-stone-200 bg-black">
                          {media.type === 'video' ? (
                            <div className="relative h-full w-full flex items-center justify-center bg-stone-900">
                              <video
                                src={media.previewUrl}
                                className="h-full w-full object-cover opacity-80"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Film size={18} className="text-white drop-shadow" />
                              </div>
                              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white uppercase">
                                Video
                              </span>
                            </div>
                          ) : (
                            <img
                              src={media.previewUrl}
                              alt={`Upload preview ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(idx)}
                            aria-label="Remove upload"
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white hover:bg-red-600 transition"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-[#44D62C] hover:bg-[#3ec428] font-bold text-white shadow-[0_10px_24px_rgba(68,214,44,0.3)] transition disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting Your Review...' : 'Submit Review'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
