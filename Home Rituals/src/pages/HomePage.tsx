import { motion } from 'framer-motion';
import { ArrowRight, Coins, Heart, Home, Layers, Leaf, Settings, ShieldCheck, Sparkles, Star, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProductCard } from '../components/ui/ProductCard';
import { Skeleton } from '../components/ui/Skeleton';
import { useApp } from '../context/AppContext';

import whyChooseBg from '../assets/why-choose-bg.jpg';

const concerns = [
  { title: 'Powerful Cleaning', text: 'Fast-acting formulas that remove dirt, odor, and grime with ease.', icon: Sparkles },
  { title: 'Hygiene Focused', text: 'Made to support cleaner kitchens, bathrooms, and everyday high-touch areas.', icon: ShieldCheck },
  { title: 'Easy to Use', text: 'Simple solutions for busy homes and effortless daily upkeep.', icon: Settings },
  { title: 'Reliable Results', text: 'Consistent performance you can count on for regular maintenance.', icon: TrendingUp },
  { title: 'Affordable Essentials', text: 'Practical products that keep homes fresh without overcomplicating routines.', icon: Coins },
  { title: 'Thoughtful Care', text: 'Designed for families who want healthier spaces with less effort.', icon: Heart },
];

const instagramReels = [
  {
    id: 1,
    title: 'Morning cleaning ritual',
    url: 'https://www.instagram.com/reel/DaiWjuOSkbg/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
    thumbnail: '/reels/reel-1.jpg',
    previewVideoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    id: 2,
    title: 'Kitchen counter glow',
    url: 'https://www.instagram.com/reel/DZ2YyyQK2HO/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
    thumbnail: '/reels/reel-2.jpg',
    previewVideoUrl: 'https://www.w3schools.com/html/movie.mp4',
  },
  {
    id: 3,
    title: 'Fresh laundry finish',
    url: 'https://www.instagram.com/reel/DaKBJZAIWpM/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
    thumbnail: '/reels/reel-3.jpg',
    previewVideoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    id: 4,
    title: 'Satisfying home organization',
    url: 'https://www.instagram.com/reel/DZ_0C_MxnNE/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
    thumbnail: '/reels/reel-4.jpg',
    previewVideoUrl: 'https://www.w3schools.com/html/movie.mp4',
  },
  {
    id: 5,
    title: 'Family cleaning routine',
    url: 'https://www.instagram.com/reel/DZ6jnjCRTmn/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
    thumbnail: '/reels/reel-5.jpg',
    previewVideoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    id: 6,
    title: 'Weekend home reset',
    url: 'https://www.instagram.com/reel/DZsPIbOtjwY/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
    thumbnail: '/reels/reel-6.jpg',
    previewVideoUrl: 'https://www.w3schools.com/html/movie.mp4',
  },
];

export function HomePage() {
  const { products, addToCart, toggleWishlist, wishlistIds } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredReelId, setHoveredReelId] = useState<number | null>(null);
  const [realReviews, setRealReviews] = useState<any[]>([]);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = heroVideoRef.current;
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

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const collected: any[] = [];
    products.forEach((p) => {
      try {
        const stored = localStorage.getItem(`home-rituals-reviews-${p.id}`);
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) collected.push(...list);
        }
      } catch {}
    });
    setRealReviews(collected);
  }, [products]);

  return (
    <div>
      <section className="w-full bg-[#E7E2D6] relative">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-24 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center relative overflow-visible">
          {/* Background ambient lighting */}
          
          <div className="absolute bottom-12 right-1/4 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl -z-10" />

          {/* Left Column (Content) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col justify-center"
          >
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 shadow-sm">
              <Sparkles size={14} className="text-emerald-600 animate-pulse" />
              New cleaning essentials • Powerful home hygiene solutions
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] text-[#223229] sm:text-5xl lg:text-[56px]" style={{ fontFamily: 'Playfair Display, serif' }}>
              Cleaner, healthier homes <span className="italic font-serif text-[#0B8F3C] font-normal">made simple</span>.
            </h1>
            <p className="mt-6 max-w-xl text-base md:text-lg leading-8 text-[#5f5f5f]">
              From washing machine care to kitchen and bathroom sanitation, Home Rituals offers reliable cleaning essentials that make everyday upkeep easier, faster, and more effective.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button to="/shop" icon={<ArrowRight size={16} />} className="group shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                Shop cleaning essentials
              </Button>
              <Button to="/shop" variant="primary" className="bg-[#14291D] text-[#FBF9F5] hover:bg-[#203D2D] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                Explore shop
              </Button>
            </div>
          </motion.div>

          {/* Right Column (Hero Video) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            className="relative flex items-center justify-center overflow-visible select-none py-8"
          >
            {/* Soft background glow */}
            <div className="absolute w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl -z-10" />

            {/* Video Container matching previous animation area with rounded edges */}
            <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[400px] md:h-[400px] rounded-2xl overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.08)] border border-stone-200/80 bg-white">
              <video
                ref={(el) => {
                  heroVideoRef.current = el;
                  if (el) {
                    el.muted = true;
                    el.defaultMuted = true;
                  }
                }}
                src="/Animation.mp4"
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
                className="h-full w-full object-cover rounded-2xl"
              >
                <source src="/Animation.mp4?v=3" type="video/mp4" />
                <source src="/Animation.mp4" type="video/mp4" />
                <source src="/animation.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 relative overflow-visible">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 left-12 w-80 h-32 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-stone-100 pb-8 relative">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-800 bg-emerald-500/5 border border-emerald-500/15 rounded-full px-3.5 py-1.5 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Best Sellers</span>
            </div>
            <h2 className="text-3xl font-semibold leading-tight text-[#223229] sm:text-4xl" style={{ fontFamily: 'Playfair Display, serif' }}>
              Beloved essentials for <span className="italic font-serif text-[#0B8F3C] font-normal">everyday rituals</span>
            </h2>
          </div>
          <Link 
            to="/shop" 
            className="group inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-800 hover:border-emerald-500 hover:text-emerald-700 shadow-sm hover:shadow transition-all duration-300 hover:-translate-y-0.5 w-fit"
          >
            <span>Shop all products</span>
            <ArrowRight size={14} className="transform transition-transform duration-300 group-hover:translate-x-1 text-stone-400 group-hover:text-emerald-600" />
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[20px] border border-[#EAEAEA] bg-white p-4 shadow-[0_8px_25px_rgba(0,0,0,0.08)]">
                <Skeleton className="aspect-square w-full" />
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {products.slice(0, 4).map((product) => (
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
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-[40px] bg-[#0E2618] bg-cover bg-center p-8 text-white shadow-[0_30px_70px_rgba(7,24,14,0.3)] sm:p-10 lg:p-14 z-0"
          style={{ backgroundImage: `url(${whyChooseBg})` }}
        >
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] relative z-10">
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-center gap-3.5 mb-4">
                  <div className="w-8 sm:w-12 h-[1.5px] bg-[#D4AF37]/70" />
                  <span className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
                    Why choose Home Rituals
                  </span>
                  <div className="w-8 sm:w-12 h-[1.5px] bg-[#D4AF37]/70" />
                </div>
                <h2 className="text-3xl font-normal leading-[1.18] sm:text-4xl lg:text-[42px] text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Reliable cleaning,<br />
                  <span className="italic font-normal text-[#96B87E]">made simple</span> for<br />
                  modern homes.
                </h2>
                <p className="mt-4 max-w-xl text-[14.5px] sm:text-base leading-relaxed text-[#B7C9BB]/85">
                  We combine effective sanitation, practical performance, and easy-to-use essentials for kitchens, bathrooms, laundry, and beyond.
                </p>
              </div>

              <div className="mt-8 space-y-7">
                {/* Stats Grid - Borderless typography */}
                <div className="grid gap-4 grid-cols-3">
                  {[
                    { value: '30+', label: 'Cleaning Essentials' },
                    { value: '99.9%', label: 'Hygiene Confidence' },
                    { value: '100%', label: 'Everyday Value' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-2xl sm:text-3xl font-serif font-bold leading-tight text-white">{stat.value}</p>
                      <p className="mt-1.5 text-[9px] sm:text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#9EB2A1] leading-snug">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Core values cards */}
                <div className="grid gap-3.5 sm:grid-cols-3">
                  {[
                    { title: 'Thoughtful\nIngredients', text: 'Botanical, transparent, and consciously chosen.', icon: Leaf },
                    { title: 'Quiet Luxury', text: 'Textural packaging and elevated everyday design.', icon: Layers },
                    { title: 'Home-First', text: 'Made to bring calm to each room and ritual.', icon: Home },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={item.title} className="rounded-[22px] border border-[#2D4A35]/50 bg-[#0B2215]/40 backdrop-blur-sm p-4 sm:p-5 text-white shadow-sm transition-all duration-300 hover:border-[#4B7356]/60 hover:bg-[#0E2A1B]/60 text-left">
                        <div className="mb-2.5 text-[#96B87E]">
                          <ItemIcon size={20} strokeWidth={1.6} />
                        </div>
                        <p className="text-xs sm:text-[13px] font-bold tracking-wide text-white whitespace-pre-line">{item.title}</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#9EB2A1]/80">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Warm Cream Feature Cards Grid */}
            <div className="flex items-center justify-center">
              <div className="grid gap-4 sm:grid-cols-2 w-full">
                {concerns.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-[26px] bg-[#F4F0E6] border border-[#E4DDCF] p-6 text-stone-900 shadow-[0_10px_28px_-6px_rgba(5,20,10,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                      <div className="w-10 h-10 rounded-full bg-[#E5ECE3] flex items-center justify-center text-[#214327] mb-3.5 shadow-xs">
                        <Icon size={19} strokeWidth={1.75} />
                      </div>
                      <p className="font-semibold text-[15px] sm:text-base text-[#1A2E1F] tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>{item.title}</p>
                      <p className="mt-2 text-xs leading-relaxed text-[#58665B]">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-black">Customer love</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#223229]" style={{ fontFamily: 'Playfair Display, serif' }}>Real moments from our community</h2>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-[#5e6f64]">A glimpse into the rituals our community loves.</p>
        </div>

        <div className="mt-8 flex gap-4 overflow-x-auto pb-4 pt-1">
          {instagramReels.map((reel) => {
            const isHovered = hoveredReelId === reel.id;
            const embedUrl = `${reel.url.split('?')[0]}embed`;

            return (
              <div
                key={reel.id}
                className="group relative aspect-[9/16] w-[240px] flex-none overflow-hidden rounded-[24px] border border-black/10 bg-black shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                onMouseEnter={() => setHoveredReelId(reel.id)}
                onMouseLeave={() => setHoveredReelId(null)}
              >
                {isHovered ? (
                  <iframe
                    src={embedUrl}
                    title={reel.title}
                    className="absolute inset-0 h-full w-full border-0 bg-black"
                    scrolling="no"
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture"
                  />
                ) : (
                  <a href={reel.url} target="_blank" rel="noreferrer" className="block h-full w-full">
                    <img
                      src={reel.thumbnail}
                      alt={reel.title}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Play Badge Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur-md transition duration-300 group-hover:scale-110">
                        <svg className="ml-0.5 h-5 w-5 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#2D5A43]">Instagram Reel</p>
                      <p className="mt-0.5 text-sm font-semibold leading-snug drop-shadow">{reel.title}</p>
                    </div>
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {realReviews.length > 0 ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {realReviews.slice(0, 3).map((review) => (
              <Card key={review.id} className="p-6">
                <div className="flex items-center gap-1 text-[#f4b942]">
                  {Array.from({ length: review.rating || 5 }).map((_, index) => (
                    <Star key={index} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="mt-4 text-lg font-semibold text-[#223229]">“{review.title}”</p>
                <p className="mt-3 text-sm leading-7 text-[#5e6f64]">{review.text}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black">{review.author}</p>
                  {review.verifiedPurchase && (
                    <span className="text-[11px] font-semibold text-[#2D5A43]">Verified Buyer</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[24px] border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
            <p className="text-sm font-bold text-stone-800">Clean Rituals Loved by Our Community</p>
            <p className="mt-1 text-xs text-stone-500 max-w-md mx-auto">
              Tried our products? We invite every customer to share their honest review and photos directly from each product page or product card!
            </p>
            <Link
              to="/shop"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#14291D] hover:bg-[#203D2D] px-5 py-2 text-xs font-bold text-[#FBF9F5] transition shadow-sm"
            >
              Explore Products & Reviews
            </Link>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[36px] border border-black/10 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-black">Stay close</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#223229]" style={{ fontFamily: 'Playfair Display, serif' }}>Join the ritual list</h2>
              <p className="mt-3 max-w-xl text-lg leading-8 text-[#5e6f64]">Receive first access to launches, wellness notes, and thoughtful offers.</p>
            </div>
            <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <input className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Email address" />
              <Button>Join now</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


