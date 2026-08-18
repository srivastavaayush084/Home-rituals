import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Leaf, ShieldCheck, Sparkles, Star, Truck, Waves } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProductCard } from '../components/ui/ProductCard';
import { Skeleton } from '../components/ui/Skeleton';
import { useApp } from '../context/AppContext';
import { reviews } from '../data/content';
import heroImage from '../assets/hero.png';

const concerns = [
  { title: 'Powerful Cleaning', text: 'Fast-acting formulas that remove dirt, odor, and grime with ease.', icon: Sparkles },
  { title: 'Hygiene Focused', text: 'Made to support cleaner kitchens, bathrooms, and everyday high-touch areas.', icon: ShieldCheck },
  { title: 'Easy to Use', text: 'Simple solutions for busy homes and effortless daily upkeep.', icon: BadgeCheck },
  { title: 'Reliable Results', text: 'Consistent performance you can count on for regular maintenance.', icon: Waves },
  { title: 'Affordable Essentials', text: 'Practical products that keep homes fresh without overcomplicating routines.', icon: Truck },
  { title: 'Thoughtful Care', text: 'Designed for families who want healthier spaces with less effort.', icon: Leaf },
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

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-24 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center relative overflow-visible">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#44D62C]/5 rounded-full blur-3xl -z-10" />
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
            <Button to="/shop" variant="primary" className="bg-[#44D62C]/10 border border-[#44D62C]/30 text-emerald-800 hover:bg-[#44D62C]/20 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5">
              Explore shop
            </Button>
          </div>
        </motion.div>

        {/* Right Column (Beautified Visual Composition) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          className="relative flex items-center justify-center overflow-visible select-none py-8"
        >
          {/* Soft background glow */}
          <div className="absolute w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl -z-10" />

          {/* Floating Shadow */}
          <motion.div
            animate={{ scale: [0.92, 1.05, 0.92], opacity: [0.25, 0.15, 0.25] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-6 w-56 h-8 bg-black/10 rounded-full blur-lg -z-10"
          />

          {/* Main Floating Platform */}
          <motion.div
            animate={{ y: [0, -12, 0], rotate: [0, 1.5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-80 h-80 flex items-center justify-center"
          >
            {/* The 3D Platform Image */}
            <img src={heroImage} alt="Home Rituals Platform" className="w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.06)]" />

            {/* Overlay floating glassmorphic Card 1 */}
            <motion.div 
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 right-2 bg-white/80 border border-white/60 rounded-2xl p-4 shadow-xl backdrop-blur-md flex items-center gap-3 w-48"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Sparkles size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-stone-900 leading-none">Clean Formulation</p>
                <p className="text-[10px] text-stone-500 mt-1">100% Plant-based</p>
              </div>
            </motion.div>

            {/* Overlay floating glassmorphic Card 2 */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              className="absolute bottom-16 left-0 bg-white/80 border border-white/60 rounded-2xl p-4 shadow-xl backdrop-blur-md flex items-center gap-3 w-48"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Leaf size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-stone-900 leading-none">Refreshing Scent</p>
                <p className="text-[10px] text-stone-500 mt-1">Essential oils infused</p>
              </div>
            </motion.div>

            {/* Floating Sparkles and Leaves in the air */}
            <motion.div
              animate={{ y: [-6, 6, -6], rotate: [0, 20, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-6 left-16 text-emerald-500/40"
            >
              <Leaf size={22} />
            </motion.div>
            
            <motion.div
              animate={{ y: [6, -6, 6], rotate: [0, -15, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className="absolute bottom-24 right-6 text-emerald-600/30"
            >
              <Sparkles size={18} />
            </motion.div>
          </motion.div>
        </motion.div>
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
        <div className="overflow-hidden rounded-[36px] bg-[#44D62C] p-8 text-white shadow-[0_30px_70px_rgba(79,111,87,0.25)] sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-black">Why choose Home Rituals</p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl" style={{ fontFamily: 'Playfair Display, serif' }}>Reliable cleaning, made simple for modern homes.</h2>
              <p className="mt-4 max-w-xl text-lg leading-8 text-white/80">We combine effective sanitation, practical performance, and easy-to-use essentials for kitchens, bathrooms, laundry, and beyond.</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { value: 30, label: 'Cleaning essentials', suffix: '+' },
                  { value: 99.9, label: 'Hygiene confidence', suffix: '%' },
                  { value: 100, label: 'Everyday value', suffix: '%' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[20px] border-2 border-black bg-white p-4 text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#f7f7f7]">
                    <p className="text-xl font-semibold leading-tight text-black">{stat.value}{stat.suffix}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-black/70">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { title: 'Thoughtful ingredients', text: 'Botanical, transparent, and consciously chosen.' },
                  { title: 'Quiet luxury', text: 'Textural packaging and elevated everyday design.' },
                  { title: 'Home-first', text: 'Made to bring calm to each room and ritual.' },
                ].map((item) => (
                  <div key={item.title} className="rounded-[24px] border-2 border-black bg-white p-5 text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#f7f7f7]">
                    <p className="text-base font-semibold text-black">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-black/70">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                {concerns.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-[24px] border-2 border-black bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#f7f7f7]">
                      <Icon size={20} className="text-black" />
                      <p className="mt-3 font-semibold text-black">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-black/70">{item.text}</p>
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
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#44D62C]">Instagram Reel</p>
                      <p className="mt-0.5 text-sm font-semibold leading-snug drop-shadow">{reel.title}</p>
                    </div>
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {reviews.slice(0, 3).map((review) => (
            <Card key={review.id} className="p-6">
              <div className="flex items-center gap-1 text-[#D7A86E]">
                {Array.from({ length: review.rating }).map((_, index) => <Star key={index} size={14} fill="currentColor" />)}
              </div>
              <p className="mt-4 text-lg font-semibold text-[#223229]">“{review.title}”</p>
              <p className="mt-3 text-sm leading-7 text-[#5e6f64]">{review.text}</p>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-black">{review.author}</p>
            </Card>
          ))}
        </div>
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


