import { useState, useEffect, useMemo, useRef, Component, type ErrorInfo, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

// Error Boundary to log any issues
class QuickViewErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('QuickView Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      console.warn('QuickView rendering failed due to:', this.state.error?.message);
    }
    return this.props.children;
  }
}

type AccordionKey = 'description' | 'howToUse' | 'faqs';

export function QuickViewModalContent() {
  const { quickViewProduct, closeQuickView, addToCart } = useApp();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState<AccordionKey | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const images = useMemo<string[]>(() => {
    if (!quickViewProduct) return [];
    if (Array.isArray(quickViewProduct.images) && quickViewProduct.images.length > 0) {
      return quickViewProduct.images.map(img => String(img));
    }
    return [String(quickViewProduct.image || '/washing-machine-cleaner.png')];
  }, [quickViewProduct]);

  useEffect(() => {
    if (!quickViewProduct) return;

    setSelectedImageIndex(0);
    setQuantity(1);
    setActiveAccordion(null);

    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeQuickView();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeQuickView, quickViewProduct]);

  if (!quickViewProduct) return null;

  // Safely extract category string if populated as an object
  const categoryName = typeof quickViewProduct.category === 'object' && quickViewProduct.category !== null
    ? (quickViewProduct.category as any).name || 'Cleaning Essential'
    : String(quickViewProduct.category || 'Cleaning Essential');

  const currentImage = images[selectedImageIndex] || String(quickViewProduct.image || '/washing-machine-cleaner.png');
  const canNavigate = images.length > 1;
  const features = Array.isArray(quickViewProduct.features) ? quickViewProduct.features.map(f => String(f)) : [];
  const highlights = Array.isArray(quickViewProduct.highlights) ? quickViewProduct.highlights.map(h => String(h)) : [];
  const faqs = (quickViewProduct as any)?.faqs as Array<{ question: string; answer: string }> | undefined;

  const price = Number(quickViewProduct.price) || 0;
  const originalPrice = Number(quickViewProduct.originalPrice) || 0;

  const handleNextImage = () => {
    setSelectedImageIndex((current) => (current + 1) % images.length);
  };

  const handlePreviousImage = () => {
    setSelectedImageIndex((current) => (current - 1 + images.length) % images.length);
  };

  const handleAddToCart = () => {
    addToCart(quickViewProduct, quantity);
    closeQuickView();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:px-4 overflow-y-auto"
      onClick={closeQuickView}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close quick view"
          onClick={closeQuickView}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-md transition hover:scale-105 hover:bg-stone-100"
        >
          <X size={18} />
        </button>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
            
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-[24px] bg-stone-100 p-3 sm:p-4 border border-stone-200">
                <img
                  src={currentImage}
                  alt={String(quickViewProduct.name || 'Product')}
                  loading="lazy"
                  className="aspect-square w-full rounded-[18px] object-cover"
                />

                {canNavigate ? (
                  <>
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={handlePreviousImage}
                      className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-800 shadow-md transition hover:scale-105"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-800 shadow-md transition hover:scale-105"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </>
                ) : null}
              </div>

              {images.length > 1 ? (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      aria-label={`Show image ${index + 1}`}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] border-2 bg-stone-100 p-1 transition ${
                        selectedImageIndex === index ? 'border-[#44D62C] shadow-sm' : 'border-transparent'
                      }`}
                    >
                      <img src={image} alt={`${quickViewProduct.name} thumbnail ${index + 1}`} loading="lazy" className="h-full w-full rounded-[10px] object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Product Details */}
            <div className="flex flex-col">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#44D62C]">
                {categoryName}
              </p>

              <h2 id="quick-view-title" className="mt-2 text-2xl font-serif font-bold tracking-tight text-stone-900 sm:text-3xl">
                {String(quickViewProduct.name)}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-600">
                {quickViewProduct.variant ? (
                  <span className="rounded-full bg-green-50 text-[#44D62C] border border-green-200 px-3 py-1">{String(quickViewProduct.variant)}</span>
                ) : null}
                {quickViewProduct.packSize ? (
                  <span className="rounded-full border border-stone-200 px-3 py-1">{String(quickViewProduct.packSize)}</span>
                ) : null}
                <span className="rounded-full border border-stone-200 px-3 py-1">
                  {quickViewProduct.stockStatus || ((quickViewProduct as any).stock > 0 ? 'In Stock' : 'In Stock')}
                </span>
              </div>

              {features.length > 0 ? (
                <div className="mt-4 rounded-[16px] border border-stone-200 bg-stone-50 p-4">
                  <ul className="grid gap-2 text-xs font-semibold text-stone-800 sm:grid-cols-2">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-0.5 text-[#44D62C]">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {quickViewProduct.shortDescription || quickViewProduct.description ? (
                <p className="mt-4 text-sm leading-relaxed text-stone-600">
                  {String(quickViewProduct.shortDescription || quickViewProduct.description)}
                </p>
              ) : null}

              {highlights.length > 0 ? (
                <div className="mt-4 rounded-[18px] border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#44D62C]">
                    <Check size={14} />
                    Product Highlights
                  </div>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-stone-800">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[#44D62C]">
                          <Check size={12} />
                        </span>
                        {highlight}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Price & Quantity */}
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  {originalPrice > price ? (
                    <p className="text-base text-stone-400 line-through">₹{originalPrice}</p>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-bold text-stone-900">₹{price}</p>
                    {originalPrice > price ? (
                      <span className="rounded-full bg-[#44D62C] px-3 py-0.5 text-xs font-bold text-white">
                        {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center rounded-full border border-stone-300 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="min-w-8 text-center text-sm font-bold text-stone-900">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((current) => current + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#44D62C] hover:bg-[#3bc224] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition"
                >
                  <ShoppingBag size={17} />
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={closeQuickView}
                  className="rounded-full border border-stone-300 bg-white px-5 py-3.5 text-sm font-semibold text-stone-800 hover:border-stone-400 transition"
                >
                  Close Window
                </button>
              </div>

              {/* Features badges */}
              <div className="mt-6 grid gap-3 rounded-[18px] border border-stone-200 bg-stone-50 p-4 text-xs font-medium text-stone-600 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-[#44D62C]" />
                  Free Express Shipping
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#44D62C]" />
                  100% Quality Guaranteed
                </div>
              </div>

              {/* Accordions */}
              <div className="mt-6 space-y-2">
                <div className="rounded-[14px] border border-stone-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold text-stone-900"
                    onClick={() => setActiveAccordion(activeAccordion === 'description' ? null : 'description')}
                  >
                    <span>Product Description</span>
                    <ChevronDown size={16} className={`transition ${activeAccordion === 'description' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeAccordion === 'description' ? (
                    <div className="border-t border-stone-100 px-4 py-3 text-xs leading-relaxed text-stone-600">
                      {String(quickViewProduct.description || 'No detailed description available.')}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[14px] border border-stone-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold text-stone-900"
                    onClick={() => setActiveAccordion(activeAccordion === 'howToUse' ? null : 'howToUse')}
                  >
                    <span>How to Use</span>
                    <ChevronDown size={16} className={`transition ${activeAccordion === 'howToUse' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeAccordion === 'howToUse' ? (
                    <div className="border-t border-stone-100 px-4 py-3 text-xs leading-relaxed text-stone-600">
                      {String(quickViewProduct.howToUse || 'Use as directed on the label for optimal cleaning performance.')}
                    </div>
                  ) : null}
                </div>

                {faqs && Array.isArray(faqs) && faqs.length > 0 ? (
                  <div className="rounded-[14px] border border-stone-200 bg-white overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold text-stone-900"
                      onClick={() => setActiveAccordion(activeAccordion === 'faqs' ? null : 'faqs')}
                    >
                      <span>Frequently Asked Questions ({faqs.length})</span>
                      <ChevronDown size={16} className={`transition ${activeAccordion === 'faqs' ? 'rotate-180' : ''}`} />
                    </button>
                    {activeAccordion === 'faqs' ? (
                      <div className="border-t border-stone-100 px-4 py-3 text-xs space-y-2 text-stone-600">
                        {faqs.map((f, i) => (
                          <div key={i}>
                            <p className="font-semibold text-stone-800">{String(f.question)}</p>
                            <p className="text-stone-500 mt-0.5">{String(f.answer)}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuickViewModal() {
  return (
    <QuickViewErrorBoundary>
      <QuickViewModalContent />
    </QuickViewErrorBoundary>
  );
}

export default QuickViewModal;
