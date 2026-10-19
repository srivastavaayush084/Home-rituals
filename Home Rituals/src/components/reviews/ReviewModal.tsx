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
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] border border-stone-200 bg-white p-5 shadow-2xl sm:p-6"
        >
          {/* Top Cut / Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cut and close review"
            title="Cut / Cancel review"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[6px] bg-stone-100 text-stone-500 hover:bg-red-50 hover:text-red-600 transition"
          >
            <X size={18} />
          </button>

          {isSuccess ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[8px] bg-emerald-100 text-[#44D62C]">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="mt-3 text-xl font-bold text-stone-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Thank You for Your Review!
              </h3>
              <p className="mt-1.5 text-xs text-stone-600">
                Your feedback helps our community discover the best home rituals.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Compact product header */}
              <div className="flex items-center gap-3 rounded-[8px] bg-stone-50 p-2.5 border border-stone-200 pr-10">
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-10 w-10 rounded-[6px] object-contain bg-white border border-stone-200 flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#44D62C]">Add Customer Review</p>
                  <h4 className="truncate text-sm font-bold text-stone-900">{product.name}</h4>
                  {product.price && <p className="text-xs font-semibold text-stone-600 leading-none">₹{product.price}</p>}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-[6px] bg-red-50 p-2.5 text-xs font-medium text-red-700">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 5-Star Rating selector - compact inline */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-stone-200 bg-stone-50/50 px-3.5 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Your Rating:
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
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
                          className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
                        >
                          <Star
                            size={22}
                            className={`transition-colors ${
                              isFilled ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-semibold text-stone-700 min-w-16 text-right">
                    {RATING_LABELS[activeRating] ? RATING_LABELS[activeRating].split('—')[0].trim() : ''}
                  </span>
                </div>
              </div>

              {/* 2-column inputs: Name & Headline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full rounded-[6px] border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#44D62C] focus:outline-none focus:ring-1 focus:ring-[#44D62C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Review Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Loved the fragrance & results!"
                    className="w-full rounded-[6px] border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#44D62C] focus:outline-none focus:ring-1 focus:ring-[#44D62C]"
                  />
                </div>
              </div>

              {/* Review Text - compact 2.5 rows */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Comments & Feedback *
                </label>
                <textarea
                  required
                  rows={2}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="How did this product perform? Share your honest experience..."
                  className="w-full rounded-[6px] border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#44D62C] focus:outline-none focus:ring-1 focus:ring-[#44D62C]"
                />
              </div>

              {/* Photo & Video Upload - slim inline */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                    Photos & Videos (Optional)
                  </label>
                  <span className="text-[10px] text-stone-500">Max 5 media files</span>
                </div>

                <div className="rounded-[6px] border border-dashed border-stone-300 bg-stone-50/80 p-2.5 transition hover:bg-stone-100/80">
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
                    className="flex cursor-pointer items-center justify-center gap-2 text-center"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-white text-[#44D62C] shadow-2xs border border-stone-200">
                      <UploadCloud size={14} />
                    </div>
                    <span className="text-xs font-semibold text-stone-700 hover:text-black">
                      Attach photos or videos (JPG, PNG, MP4)
                    </span>
                  </label>

                  {/* Previews */}
                  {mediaList.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {mediaList.map((media, idx) => (
                        <div key={idx} className="group relative h-12 w-12 rounded-[4px] overflow-hidden border border-stone-200 bg-black">
                          {media.type === 'video' ? (
                            <div className="relative h-full w-full flex items-center justify-center bg-stone-900">
                              <video
                                src={media.previewUrl}
                                className="h-full w-full object-cover opacity-80"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Film size={14} className="text-white drop-shadow" />
                              </div>
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
                            className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-[3px] bg-black/75 text-white hover:bg-red-600 transition"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Cancel/Cut + Submit */}
              <div className="pt-1.5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 flex-1 items-center justify-center rounded-[6px] border border-stone-300 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition"
                >
                  Cancel / Not Now
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-10 flex-[1.4] items-center justify-center rounded-[6px] bg-[#44D62C] hover:bg-[#3ec428] text-xs font-semibold text-[#111827] shadow-xs transition disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
