import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  Heart,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  User,
  Mail,
  ShieldCheck,
  Leaf,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { apiRequest } from '../../utils/apiClient';

interface LayoutProps {
  children: React.ReactNode;
}

interface ImageBanner {
  id: string;
  imageUrl: string;
  title: string;
  linkUrl: string;
  order: number;
}

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'About', to: '/about' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact' },
];

function getCategoryName(category: any): string {
  if (!category) return '';
  if (typeof category === 'string') return category;
  if (typeof category === 'object' && category.name) return category.name;
  return '';
}

function PromotionalBannerSlider({ banners }: { banners: ImageBanner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const defaultBanners: ImageBanner[] = [
    {
      id: 'default-1',
      imageUrl: '/banner-flat-47-off.jpg',
      title: 'Flat 47% OFF - Everyday Essentials',
      linkUrl: '/shop',
      order: 1,
    },
    {
      id: 'default-2',
      imageUrl: '/banner-stay-tuned.jpg',
      title: 'Conscious Cleaning - Stay Tuned',
      linkUrl: '/shop',
      order: 2,
    },
  ];

  const list = banners.length > 0 ? banners : defaultBanners;

  useEffect(() => {
    if (isPaused || list.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, list.length]);

  return (
    <div
      className="relative w-full overflow-hidden bg-[#0F1F17]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-in-out w-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {list.map((banner, index) => {
          const isDefaultBanner =
            banner.imageUrl.includes('banner-flat-47-off.jpg') ||
            banner.imageUrl.includes('banner-stay-tuned.jpg');
          const showOverlay = !isDefaultBanner && banner.title && banner.title.trim().length > 0;
          return (
            <Link
              key={banner.id || index}
              to={banner.linkUrl || '/shop'}
              className="w-full shrink-0 relative block group"
            >
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full aspect-[2.1/1] sm:aspect-auto h-auto sm:h-[450px] lg:h-[540px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {showOverlay && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-10 lg:p-12 text-white">
                  <div className="max-w-4xl space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A880] text-[#14291D] text-xs font-semibold uppercase tracking-widest shadow-md">
                      <Sparkles size={13} /> Exclusive Ritual
                    </span>
                    <h3 className="text-xl sm:text-3xl lg:text-4xl font-serif font-bold text-white leading-tight drop-shadow-md">
                      {banner.title}
                    </h3>
                    <div className="pt-2 flex items-center gap-2 text-sm font-semibold text-[#C5A880] group-hover:translate-x-2 transition duration-300">
                      Shop Ritual Now <ArrowRight size={18} />
                    </div>
                  </div>
                </div>
              )}
            </Link>
          );
        })}
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
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'w-7 bg-[#C5A880]' : 'w-2 bg-white/50 hover:bg-white'
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

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

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
    const onScroll = () => setIsScrolled(window.scrollY > 15);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
      {/* Top Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#FBF9F5]/95 backdrop-blur-md shadow-[0_2px_15px_rgba(20,41,29,0.06)] border-b border-[#E8E4DC]'
            : 'bg-[#FBF9F5] border-b border-[#E8E4DC]/80'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Home Rituals logo"
              className="h-10 w-10 rounded-full border border-[#E8E4DC] bg-white object-contain p-1 shadow-sm transition-transform duration-300 group-hover:scale-105"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] font-bold text-[#14291D]">
                Home Rituals
              </p>
              <p className="text-[11px] text-[#5C6860] tracking-wide">
                Botanical Home Hygiene
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-medium tracking-wide transition-colors ${
                    isActive
                      ? 'text-[#14291D] font-semibold border-b-2 border-[#14291D] pb-0.5'
                      : 'text-[#5C6860] hover:text-[#14291D]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Action Icons & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search */}
            <button
              onClick={openSearch}
              className="rounded-full border border-[#E8E4DC] bg-white p-2.5 text-[#14291D] shadow-sm transition hover:bg-[#F5F1EA] hover:border-[#D5CFC3] cursor-pointer"
              aria-label="Search"
            >
              <Search size={17} />
            </button>

            {/* Wishlist with counter */}
            <button
              onClick={openWishlist}
              className="relative rounded-full border border-[#E8E4DC] bg-white p-2.5 text-[#14291D] shadow-sm transition hover:bg-[#F5F1EA] hover:border-[#D5CFC3] cursor-pointer"
              aria-label="Wishlist"
            >
              <Heart size={17} />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#2D5A43] text-[9px] font-bold text-white shadow-sm">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            {/* Cart with counter */}
            <button
              onClick={openCart}
              className="relative rounded-full border border-[#E8E4DC] bg-white p-2.5 text-[#14291D] shadow-sm transition hover:bg-[#F5F1EA] hover:border-[#D5CFC3] cursor-pointer"
              aria-label="Cart"
            >
              <ShoppingBag size={17} />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#14291D] text-[9px] font-bold text-[#FBF9F5] shadow-sm">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Auth / Profile Area */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#14291D] px-3.5 py-1.5 bg-[#F5F1EA] hover:bg-[#EAE4D7] border border-[#E8E4DC] rounded-full transition"
                >
                  <User size={13} className="text-[#2D5A43]" />
                  <span>Hi, {user.name.split(' ')[0]}</span>
                </Link>
                {user.role === 'ADMIN' ? (
                  <Button
                    to="/admin"
                    variant="primary"
                    size="sm"
                    className="hidden sm:inline-flex bg-[#2D5A43] hover:bg-[#203D2D] text-xs py-1.5 px-3"
                  >
                    Admin Panel
                  </Button>
                ) : null}
                <button
                  onClick={logout}
                  className="hidden sm:inline-flex text-xs font-medium text-stone-600 hover:text-red-700 bg-white hover:bg-stone-100 border border-[#E8E4DC] px-2.5 py-1.5 rounded-full transition cursor-pointer"
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

            {/* Mobile menu trigger */}
            <button
              className="rounded-full border border-[#E8E4DC] bg-white p-2.5 text-[#14291D] shadow-sm transition hover:bg-[#F5F1EA] lg:hidden cursor-pointer"
              aria-label="Menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={17} />
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen ? (
          <div className="border-t border-[#E8E4DC] bg-[#FBF9F5] px-5 py-5 lg:hidden shadow-lg animate-fadeIn">
            <div className="flex flex-col gap-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `text-sm font-medium py-1.5 transition ${
                      isActive ? 'text-[#14291D] font-bold' : 'text-[#5C6860] hover:text-[#14291D]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-3 pt-3 border-t border-[#E8E4DC] flex flex-col gap-3">
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 text-sm font-medium text-[#14291D]"
                    >
                      <User size={15} className="text-[#2D5A43]" />
                      Profile ({user.name})
                    </Link>
                    {user.role === 'ADMIN' ? (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-semibold text-[#2D5A43]"
                      >
                        Admin Panel
                      </Link>
                    ) : null}
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-fit text-left text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center rounded-xl bg-[#14291D] text-[#FBF9F5] py-2.5 text-sm font-semibold shadow-sm"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {location.pathname === '/' ? (
        <section className="w-full border-b border-[#E8E4DC] overflow-hidden">
          <PromotionalBannerSlider banners={imageBanners} />
        </section>
      ) : null}

      {/* Main Page Content */}
      <AnimatePresence mode="wait">
        <motion.main
          key={
            location.pathname === '/login' || location.pathname === '/register'
              ? 'auth-screen'
              : location.pathname
          }
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            backgroundColor:
              location.pathname === '/login' || location.pathname === '/register'
                ? '#091f17'
                : undefined,
          }}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* Search Modal */}
      {isSearchOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={closeSearch}>
          <div
            className="mx-auto mt-20 max-w-2xl rounded-2xl border border-[#E8E4DC] bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#14291D]">
                Search Rituals
              </p>
              <button
                onClick={closeSearch}
                className="rounded-full bg-[#F5F1EA] p-2 text-[#14291D] hover:bg-[#EAE4D7] transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search formulations, cleaners, or refills..."
              autoFocus
              className="mt-4 w-full rounded-xl border border-[#E8E4DC] bg-[#FBF9F5] px-4 py-3 text-sm text-[#14291D] outline-none focus:border-[#2D5A43]"
            />
            <div className="mt-4 max-h-72 space-y-2.5 overflow-auto">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  onClick={closeSearch}
                  className="flex items-center justify-between rounded-xl border border-[#F0ECE4] bg-[#FBF9F5] px-4 py-3 hover:border-[#D5CFC3] transition"
                >
                  <div>
                    <p className="font-semibold text-sm text-[#14291D]">{product.name}</p>
                    <p className="text-xs text-[#5C6860]">{getCategoryName(product.category)}</p>
                  </div>
                  <p className="text-sm font-bold text-[#14291D]">₹{product.price}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Cart Drawer */}
      {isCartOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={closeCart}>
          <div
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl border-l border-[#E8E4DC]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-[#2D5A43]" />
                <h2 className="text-lg font-semibold text-[#14291D]">Your Bag</h2>
                <span className="text-xs text-[#5C6860]">({totalCartCount} items)</span>
              </div>
              <button
                onClick={closeCart}
                className="rounded-full bg-[#F5F1EA] p-2 text-[#14291D] hover:bg-[#EAE4D7] transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-auto">
              {cart.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag size={32} className="mx-auto text-stone-300 mb-2" />
                  <p className="text-sm text-[#5C6860]">Your bag is empty.</p>
                  <Button to="/shop" onClick={closeCart} size="sm" className="mt-4">
                    Explore Essentials
                  </Button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between rounded-xl border border-[#F0ECE4] bg-[#FBF9F5] p-3.5"
                  >
                    <div>
                      <p className="font-semibold text-xs sm:text-sm text-[#14291D]">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-[#5C6860] mt-0.5">
                        Qty {item.quantity} • ₹{item.product.price}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-xs font-medium text-stone-500 hover:text-red-700 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="pt-4 border-t border-[#F0ECE4]">
                <Button to="/cart" onClick={closeCart} className="w-full">
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Wishlist Drawer */}
      {isWishlistOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={closeWishlist}>
          <div
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl border-l border-[#E8E4DC]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-4">
              <div className="flex items-center gap-2">
                <Heart size={20} className="text-[#2D5A43]" />
                <h2 className="text-lg font-semibold text-[#14291D]">Saved Rituals</h2>
                <span className="text-xs text-[#5C6860]">({wishlistIds.length})</span>
              </div>
              <button
                onClick={closeWishlist}
                className="rounded-full bg-[#F5F1EA] p-2 text-[#14291D] hover:bg-[#EAE4D7] transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-auto">
              {wishlistIds.length === 0 ? (
                <div className="py-16 text-center">
                  <Heart size={32} className="mx-auto text-stone-300 mb-2" />
                  <p className="text-sm text-[#5C6860]">No saved favourites yet.</p>
                </div>
              ) : (
                wishlistIds.map((id) => {
                  const product = products.find((item) => item.id === id);
                  return (
                    <div
                      key={id}
                      className="rounded-xl border border-[#F0ECE4] bg-[#FBF9F5] p-3.5 text-sm"
                    >
                      <p className="font-semibold text-xs sm:text-sm text-[#14291D]">
                        {product?.name ?? `Product ${id}`}
                      </p>
                      <p className="mt-1 text-xs text-[#5C6860]">
                        {getCategoryName(product?.category) || 'Saved formulation'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Available on Retail Channels Section */}
      <section className="relative overflow-hidden bg-[#F5F1EA] py-10 border-t border-[#E8E4DC]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-[#14291D] tracking-tight text-center md:text-left">
              Also available on
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
              <a
                href="https://amazon.in"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center hover:opacity-80 transition py-2 px-1"
              >
                <div className="flex flex-col items-center select-none pt-1">
                  <span className="text-2xl font-bold tracking-tighter text-[#14291D] font-sans leading-none">
                    amazon
                  </span>
                  <svg viewBox="0 0 80 15" className="w-16 h-3 -mt-0.5" fill="none">
                    <path
                      d="M 6 2 C 30 11, 50 11, 74 2"
                      stroke="#C5A880"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 66 5 C 69 5, 74 2, 74 2 C 74 2, 71 8, 71 11"
                      stroke="#C5A880"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </a>
              <div className="hidden sm:block w-[1px] h-7 bg-[#E8E4DC]" />
              <a
                href="https://blinkit.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center hover:opacity-90 transition"
              >
                <div className="bg-[#FCD825] rounded-xl px-3.5 py-1.5 flex items-center justify-center shadow-sm">
                  <span className="font-extrabold text-black font-sans text-sm tracking-tighter lowercase">
                    blinkit
                  </span>
                </div>
              </a>
              <div className="hidden sm:block w-[1px] h-7 bg-[#E8E4DC]" />
              <a
                href="https://flipkart.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center hover:opacity-80 transition py-1"
              >
                <div className="flex items-center gap-1.5 select-none">
                  <span className="text-xl font-black font-sans italic text-[#047BD5] tracking-tight">
                    Flipkart
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Values & Trust Strip */}
      <section className="bg-[#14291D] py-10 border-t border-[#1C3A2B] text-[#FBF9F5]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D5A43]/40 border border-[#C5A880]/30 text-[#C5A880]">
                <Leaf size={20} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#FBF9F5]">
                  100% Plant-Powered
                </p>
                <p className="text-[11px] text-[#9BAAA0]">Gentle on skin, tough on grime</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D5A43]/40 border border-[#C5A880]/30 text-[#C5A880]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#FBF9F5]">
                  Zero Harsh Toxins
                </p>
                <p className="text-[11px] text-[#9BAAA0]">No bleach, parabens or dyes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D5A43]/40 border border-[#C5A880]/30 text-[#C5A880]">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#FBF9F5]">
                  Cruelty-Free Craft
                </p>
                <p className="text-[11px] text-[#9BAAA0]">Ethically made in India</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D5A43]/40 border border-[#C5A880]/30 text-[#C5A880]">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#FBF9F5]">
                  Pan-India Shipping
                </p>
                <p className="text-[11px] text-[#9BAAA0]">Delivered carefully to door</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Luxury Botanical Dark Forest Footer */}
      <footer className="border-t border-[#1C3A2B] bg-[#0F1F17] px-4 py-16 text-[#F5EFEB] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-4 lg:gap-12">
          {/* Brand Philosophy */}
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Home Rituals logo"
                className="h-12 w-12 rounded-full border border-[#C5A880]/40 bg-white/10 p-1.5 object-contain"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] font-bold text-[#F5EFEB]">
                  Home Rituals
                </p>
                <p className="text-[10px] text-[#C5A880] tracking-wider uppercase">
                  Conscious Living
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-[#9BAAA0]">
              Botanical sanitation and home care formulations crafted for intentional spaces.
              Pure ingredients, uncompromising hygiene, and effortless everyday freshness.
            </p>
          </div>

          {/* Discover Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C5A880]">
              Discover
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-[#D1DDD6]">
              <li>
                <Link to="/shop" className="transition hover:text-white">
                  All Formulations
                </Link>
              </li>
              <li>
                <Link to="/about" className="transition hover:text-white">
                  Our Story & Philosophy
                </Link>
              </li>
              <li>
                <Link to="/blog" className="transition hover:text-white">
                  Living Journal & Guides
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="transition hover:text-white">
                  Saved Rituals
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Care */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C5A880]">
              Client Care
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-[#D1DDD6]">
              <li>
                <Link to="/shipping-policy" className="transition hover:text-white">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link to="/return-policy" className="transition hover:text-white">
                  Return &amp; Exchange Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-cancellation" className="transition hover:text-white">
                  Refund &amp; Cancellation
                </Link>
              </li>
              <li>
                <Link to="/terms" className="transition hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="transition hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/faq" className="transition hover:text-white">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Studio Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C5A880]">
              Studio &amp; Contact
            </h3>
            <div className="mt-4 flex items-center gap-2.5 text-[#D1DDD6]">
              <a
                href="mailto:info@homerituals.co"
                className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:bg-[#2D5A43] hover:text-white"
                aria-label="Email"
              >
                <Mail size={15} />
              </a>
              <a
                href="https://www.instagram.com/homerituals.co/?hl=en"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:bg-[#2D5A43] hover:text-white"
                aria-label="Instagram"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/share/1Czc6yipq5/"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:bg-[#2D5A43] hover:text-white"
                aria-label="Facebook"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
            <ul className="mt-4 space-y-2 text-xs sm:text-sm text-[#9BAAA0]">
              <li className="font-medium text-[#F5EFEB]">+91 8490969922</li>
              <li className="text-[11px] leading-relaxed">
                Office No. 321, Swagat Business Hub,
                <br />
                Hazira Road, Surat, Gujarat 394510
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mx-auto max-w-7xl mt-12 pt-8 border-t border-[#1C3A2B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8A968F]">
          <p>© {new Date().getFullYear()} Home Rituals. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#C5A880]">
              <ShieldCheck size={14} /> 100% Secure Checkout via Razorpay
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
