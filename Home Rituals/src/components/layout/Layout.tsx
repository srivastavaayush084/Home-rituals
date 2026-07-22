import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Heart, Mail, Menu, Search, ShoppingBag, Sparkles, User, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { apiRequest } from '../../utils/apiClient';

interface ImageBanner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl?: string;
}

type LayoutProps = {
  children: ReactNode;
};

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Blog', to: '/blog' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];


function PromotionalBannerSlider({ banners }: { banners: ImageBanner[] }) {
  const defaultBanners: ImageBanner[] = [
    {
      id: 1,
      title: 'Flat 47% OFF On All Products — Limited Time Offer',
      imageUrl: '/banner-flat-47-off.jpg',
      linkUrl: '/shop',
    },
    {
      id: 2,
      title: 'Stay Tuned! More Offers & Deals Coming Soon',
      imageUrl: '/banner-stay-tuned.jpg',
      linkUrl: '/shop',
    },
  ];

  const list = banners && banners.length > 0 ? banners : defaultBanners;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (list.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, 5000); // Auto-slides every 5 seconds (5000ms)

    return () => clearInterval(timer);
  }, [list.length, isPaused]);

  return (
    <div
      className="relative w-full overflow-hidden bg-[#111]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-in-out w-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {list.map((banner, index) => (
          <Link
            key={banner.id || index}
            to={banner.linkUrl || '/shop'}
            className="w-full shrink-0 relative block group"
          >
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="w-full h-[320px] sm:h-[450px] lg:h-[540px] object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-10 lg:p-12 text-white">
              <div className="max-w-4xl space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#44D62C] text-[#111] text-xs font-bold uppercase tracking-widest shadow-md">
                  <Sparkles size={13} /> Exclusive Deal
                </span>
                <h3 className="text-xl sm:text-3xl lg:text-4xl font-serif font-bold text-white leading-tight drop-shadow-md">
                  {banner.title}
                </h3>
                <div className="pt-2 flex items-center gap-2 text-sm font-semibold text-[#44D62C] group-hover:translate-x-2 transition duration-300">
                  Shop Deal Now <ArrowRight size={18} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {list.length > 1 ? (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + list.length) % list.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 hover:bg-black/70 transition"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % list.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 hover:bg-black/70 transition"
            aria-label="Next Slide"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-4 right-6 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
            {list.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'w-8 bg-[#44D62C]' : 'w-2.5 bg-white/50 hover:bg-white'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imageBanners, setImageBanners] = useState<ImageBanner[]>([]);

  const {
    user,
    logout,
    products,
    cart,
    wishlistIds,
    isCartOpen,
    closeCart,
    openCart,
    isWishlistOpen,
    openWishlist,
    closeWishlist,
    isSearchOpen,
    openSearch,
    closeSearch,
    searchQuery,
    setSearchQuery,
    filteredProducts,
    removeFromCart,
  } = useApp();

  useEffect(() => {
    async function loadBanners() {
      try {
        const data = await apiRequest<ImageBanner[]>('/api/banners');
        if (data && data.length > 0) {
          setImageBanners(data);
        }
      } catch (err) {
        // Fallback to default image banners
      }
    }
    loadBanners();
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 18);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
      <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-sm backdrop-blur-xl' : 'backdrop-blur'}`} style={{ backgroundColor: 'var(--surface)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Home Rituals logo" className="h-10 w-10 rounded-full border border-black/10 bg-[#f4f4f5] object-contain shadow-sm" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-black">Home Rituals</p>
              <p className="text-[11px] text-[#6f6f6f]">Home hygiene essentials</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `text-sm font-medium transition ${isActive ? 'text-black' : 'text-[#223229] hover:text-black'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={openSearch} className="rounded-full border border-black/10 bg-[var(--surface)] p-2.5 text-[var(--text)] shadow-sm transition hover:-translate-y-0.5" aria-label="Search">
              <Search size={18} />
            </button>
            <button className="rounded-full border border-black/10 bg-[var(--surface)] p-2.5 text-[var(--text)] shadow-sm transition hover:-translate-y-0.5" aria-label="Wishlist" onClick={openWishlist}>
              <Heart size={18} />
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-full transition"
                >
                  <User size={14} className="text-stone-500" />
                  Hi, {user.name.split(' ')[0]}
                </Link>
                {user.role === 'ADMIN' ? (
                  <Button to="/admin" variant="secondary" size="sm" className="hidden sm:inline-flex bg-amber-600 text-white hover:bg-amber-700">
                    Admin Panel
                  </Button>
                ) : null}
                <button
                  onClick={logout}
                  className="hidden sm:inline-flex text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Button to="/login" variant="primary" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
            )}
            <button className="rounded-full border border-black/10 bg-[var(--surface)] p-2.5 text-[var(--text)] shadow-sm transition hover:-translate-y-0.5" aria-label="Cart" onClick={openCart}>
              <ShoppingBag size={18} />
            </button>
            <button className="rounded-full border border-black/10 bg-[var(--surface)] p-2.5 text-[var(--text)] shadow-sm transition hover:-translate-y-0.5 lg:hidden" aria-label="Menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu size={18} />
            </button>
          </div>
        </div>
        <div className="h-[2px] bg-[#44D62C]/80" />

        {mobileMenuOpen ? (
          <div className="border-t border-black/10 bg-[var(--surface)] px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-3">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-black' : 'text-[#242424]'}`}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      {location.pathname === '/' ? (
        <section className="w-full border-b border-black/10 overflow-hidden">
          <PromotionalBannerSlider banners={imageBanners} />
        </section>
      ) : null}

      <AnimatePresence mode="wait">
        <motion.main key={location.pathname} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
          {children}
        </motion.main>
      </AnimatePresence>

      {isSearchOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={closeSearch}>
          <div className="mx-auto mt-20 max-w-2xl rounded-[28px] border border-black/5 bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.35em] text-black">Search</p>
              <button onClick={closeSearch} className="rounded-full bg-[#EFE9DF] p-2 text-black"><X size={16} /></button>
            </div>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search for cleaners, pods, or essentials" className="mt-4 w-full rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3 text-sm outline-none" />
            <div className="mt-4 max-h-72 space-y-3 overflow-auto">
              {filteredProducts.map((product) => (
                <Link key={product.id} to={`/product/${product.id}`} onClick={closeSearch} className="flex items-center justify-between rounded-[20px] border border-black/5 bg-[#FAFAF8] px-4 py-3">
                  <div>
                    <p className="font-semibold text-[#242424]">{product.name}</p>
                    <p className="text-sm text-[#6f6f6f]">{product.category}</p>
                  </div>
                  <p className="text-sm font-semibold text-black">₹{product.price}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isCartOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={closeCart}>
          <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-[#242424]">Cart</h2>
              <button onClick={closeCart} className="rounded-full bg-[#EFE9DF] p-2 text-black"><X size={16} /></button>
            </div>
            <div className="mt-6 flex-1 space-y-4 overflow-auto">
              {cart.length === 0 ? <p className="text-sm text-[#6f6f6f]">Your cart is empty.</p> : cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between rounded-[20px] border border-black/5 bg-[#FAFAF8] p-4">
                  <div>
                    <p className="font-semibold text-[#242424]">{item.product.name}</p>
                    <p className="text-sm text-[#6f6f6f]">Qty {item.quantity}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="text-sm font-semibold text-black">Remove</button>
                </div>
              ))}
            </div>
            <Button to="/cart" onClick={closeCart} className="mt-6 w-full">View cart</Button>
          </div>
        </div>
      ) : null}

      {isWishlistOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={closeWishlist}>
          <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-[#242424]">Wishlist</h2>
              <button onClick={closeWishlist} className="rounded-full bg-[#EFE9DF] p-2 text-black"><X size={16} /></button>
            </div>
            <div className="mt-6 flex-1 space-y-4 overflow-auto">
              {wishlistIds.length === 0 ? <p className="text-sm text-[#6f6f6f]">No saved favourites yet.</p> : wishlistIds.map((id) => {
                const product = products.find((item) => item.id === id);
                return (
                  <div key={id} className="rounded-[20px] border border-black/5 bg-[#FAFAF8] p-4 text-sm text-[#242424]">
                    <p className="font-semibold">{product?.name ?? `Product ${id}`}</p>
                    <p className="mt-1 text-[#6f6f6f]">{product?.category ?? 'Saved item'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <footer className="border-t border-[#44D62C]/30 bg-[#44D62C] px-4 py-16 text-black shadow-[0_24px_70px_rgba(68,214,44,0.14)] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-5 lg:gap-10">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Home Rituals logo" className="h-14 w-14 rounded-full bg-white/20 object-contain p-2" />
              <p className="text-xs uppercase tracking-[0.35em] font-semibold text-black">Home Rituals</p>
            </div>
            <p className="mt-4 text-sm leading-7 font-semibold text-black/90">Reliable cleaning and sanitation solutions for homes that want freshness, hygiene, and effortless care every day.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-black">Shop</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-black/90">
              <li>
                <Link to="/shop" className="block rounded-full px-2 py-1 transition hover:bg-white/15 hover:text-black">Kitchen Care</Link>
              </li>
              <li>
                <Link to="/shop" className="block rounded-full px-2 py-1 transition hover:bg-white/15 hover:text-black">Bathroom Care</Link>
              </li>
              <li>
                <Link to="/shop" className="block rounded-full px-2 py-1 transition hover:bg-white/15 hover:text-black">Laundry</Link>
              </li>
              <li>
                <Link to="/shop" className="block rounded-full px-2 py-1 transition hover:bg-white/15 hover:text-black">Air Care</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-black">Discover</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-black/90">
              <li><Link to="/about" className="block transition hover:text-black hover:underline">About</Link></li>
              <li><Link to="/contact" className="block transition hover:text-black hover:underline">Support</Link></li>
              <li><Link to="/wishlist" className="block transition hover:text-black hover:underline">Wishlist</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-black">Company</h3>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-black/90">
              <li><Link to="/privacy-policy" className="block transition hover:text-black hover:underline">Privacy Policy</Link></li>
              <li><Link to="/terms" className="block transition hover:text-black hover:underline">Terms &amp; Conditions</Link></li>
              <li><Link to="/refund-cancellation" className="block transition hover:text-black hover:underline">Refund &amp; Cancellation</Link></li>
              <li><Link to="/shipping-policy" className="block transition hover:text-black hover:underline">Shipping Policy</Link></li>
              <li><Link to="/return-policy" className="block transition hover:text-black hover:underline">Return Policy</Link></li>
              <li><Link to="/faq" className="block transition hover:text-black hover:underline">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-black">Contact</h3>
            <div className="mt-4 flex items-center gap-3 text-black/90">
              <a href="mailto:hello@homerituals.com" className="rounded-full border border-black/10 bg-white/15 p-2.5 transition hover:bg-[#44D62C] hover:text-black" aria-label="Email">
                <Mail size={16} />
              </a>
              <a href="https://www.instagram.com/homerituals.co/?hl=en" target="_blank" rel="noreferrer" className="rounded-full border border-black/10 bg-white/15 p-2.5 transition hover:bg-[#44D62C] hover:text-black" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" />
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="rounded-full border border-black/10 bg-white/15 p-2.5 transition hover:bg-[#44D62C] hover:text-black" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18.2 4.8 12 4.8 12 4.8s-6.2 0-7.7.5A2.7 2.7 0 0 0 2.4 7.2 28.7 28.7 0 0 0 2 12a28.7 28.7 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.5.5 7.7.5 7.7.5s6.2 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28.7 28.7 0 0 0 22 12a28.7 28.7 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
                </svg>
              </a>
            </div>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-black/90">
              <li>+91 99999 11111</li>
              <li>Bombay House, Mumbai</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}


