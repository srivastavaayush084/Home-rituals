import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  title?: string;
}

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem[];
  initialIndex?: number;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  onClose,
  media,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, media.length]);

  if (!isOpen || media.length === 0) return null;

  const currentItem = media[currentIndex] || media[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close media preview"
          className="absolute right-6 top-6 z-50 flex h-10 w-10 items-center justify-center rounded-[6px] bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
        >
          <X size={20} />
        </button>

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous media"
              className="absolute left-6 z-50 flex h-10 w-10 items-center justify-center rounded-[6px] bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next media"
              className="absolute right-6 z-50 flex h-10 w-10 items-center justify-center rounded-[6px] bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex max-h-[85vh] max-w-[90vw] flex-col items-center justify-center"
        >
          {currentItem.type === 'video' ? (
            <video
              src={currentItem.url}
              controls
              autoPlay
              className="max-h-[80vh] max-w-[85vw] rounded-[8px] shadow-2xl object-contain bg-black"
            />
          ) : (
            <img
              src={currentItem.url}
              alt={currentItem.title || 'Customer review photo'}
              className="max-h-[80vh] max-w-[85vw] rounded-[8px] object-contain shadow-2xl"
            />
          )}

          {media.length > 1 && (
            <div className="mt-4 flex items-center gap-2">
              {media.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-[2px] transition-all ${
                    idx === currentIndex ? 'w-8 bg-[#44D62C]' : 'w-3 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
