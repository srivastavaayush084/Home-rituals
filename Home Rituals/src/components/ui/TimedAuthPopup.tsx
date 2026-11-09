import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { X, ArrowRight, Bookmark, Tag } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import modalLeavesTop from '../../assets/modal-leaves-top.png';
import modalLeavesBottom from '../../assets/modal-leaves-bottom.png';
import modalWave from '../../assets/modal-wave.png';
import modalLogoMark from '../../assets/modal-logo-mark.png';

const AUTH_POPUP_DELAY = 10000; // 10 seconds delay
const AUTH_POPUP_COOLDOWN = 12 * 60 * 60 * 1000; // 12 hours cooldown

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];
const AUTH_POPUP_TEXT = "Sign in or create an account to discover special offers, personalized recommendations, and member-only benefits.";

const COOLDOWN_KEY = 'home-rituals-auth-popup-last-shown';

export function TimedAuthPopup() {
  const { user, token } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Exclude authentication pages
  const isAuthPage = AUTH_PAGES.includes(location.pathname);

  // Derive authentication loading state
  const isAuthLoading = token !== null && user === null;

  // Expose global console helper for testing
  useEffect(() => {
    (window as any).openWelcomeModal = () => {
      console.log('[TimedAuthPopup] Force opening welcome modal via window.openWelcomeModal()');
      setIsOpen(true);
    };
    (window as any).resetWelcomeModalCooldown = () => {
      try {
        localStorage.removeItem(COOLDOWN_KEY);
        console.log('[TimedAuthPopup] Cooldown timestamp cleared from localStorage.');
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);
    window.addEventListener('open-welcome-modal', handleCustomOpen);
    return () => {
      window.removeEventListener('open-welcome-modal', handleCustomOpen);
    };
  }, []);

  useEffect(() => {
    // Check if user requested force popup via URL parameter e.g. /?popup=true or /?welcome=true
    const searchParams = new URLSearchParams(location.search);
    const forceShow = searchParams.get('popup') === 'true' || searchParams.get('welcome') === 'true';

    if (forceShow) {
      console.log('[TimedAuthPopup] URL param ?popup=true detected — opening modal immediately');
      setIsOpen(true);
      return;
    }

    // Suppress popup if user is logged in, auth is loading, or currently on auth pages
    if (user || isAuthLoading || isAuthPage) {
      setIsOpen(false);
      return;
    }

    // Safe read from localStorage
    let lastShown = 0;
    try {
      const stored = localStorage.getItem(COOLDOWN_KEY);
      if (stored) {
        lastShown = Number(stored);
      }
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }

    const timeSinceLastShown = Date.now() - lastShown;
    const isCooldownActive = timeSinceLastShown < AUTH_POPUP_COOLDOWN;

    console.log('[TimedAuthPopup] Status:', {
      delaySeconds: AUTH_POPUP_DELAY / 1000,
      cooldownHours: AUTH_POPUP_COOLDOWN / (60 * 60 * 1000),
      lastShown: lastShown ? new Date(lastShown).toLocaleTimeString() : 'Never',
      secondsSinceLastShown: Math.round(timeSinceLastShown / 1000),
      isCooldownActive,
      hint: 'Add ?popup=true to URL or run window.openWelcomeModal() in console to view anytime'
    });

    if (isCooldownActive) {
      return;
    }

    console.log(`[TimedAuthPopup] Triggering popup in ${AUTH_POPUP_DELAY / 1000} seconds...`);

    // Delay timer
    const timer = setTimeout(() => {
      // Re-verify conditions right before opening to prevent edge cases
      const currentPath = window.location.pathname;
      if (!user && !isAuthLoading && !AUTH_PAGES.includes(currentPath)) {
        setIsOpen(true);
        console.log('[TimedAuthPopup] Popup opened, storing timestamp');
        try {
          localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        } catch (e) {
          console.warn('Failed to write to localStorage:', e);
        }
      }
    }, AUTH_POPUP_DELAY);

    // Clean up timeout on unmount or condition changes
    return () => clearTimeout(timer);
  }, [user, isAuthLoading, isAuthPage, location.pathname, location.search]);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keydown listener for ESC key (Accessibility)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleAction = (route: '/login' | '/register') => {
    setIsOpen(false);
    // Preserve query parameters, hashes, and search queries
    const fromURL = location.pathname + location.search + location.hash;
    navigate(route, { state: { from: fromURL } });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-4 backdrop-blur-[3px]"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative flex w-full max-w-[450px] flex-col items-center overflow-hidden rounded-[34px] border border-[#E4DFD6] bg-[#FAF7F2] p-7 sm:p-8 text-center shadow-[0_28px_65px_-12px_rgba(10,26,12,0.35),0_12px_24px_-6px_rgba(0,0,0,0.12)]"
          >
            {/* Top-Left Botanical Leaves (Clean isolated greenery) */}
            <img
              src={modalLeavesTop}
              alt="Decorative Foliage Top"
              className="pointer-events-none absolute -top-1 -left-1 w-[140px] sm:w-[150px] select-none z-10"
            />

            {/* Bottom-Right Botanical Leaves (Clean isolated greenery) */}
            <img
              src={modalLeavesBottom}
              alt="Decorative Foliage Bottom"
              className="pointer-events-none absolute -bottom-1 -right-1 w-[105px] sm:w-[115px] select-none z-10"
            />

            {/* Bottom Decorative Wave with Gold Accent */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 w-full overflow-hidden z-0 select-none">
              <img
                src={modalWave}
                alt="Decorative Wave"
                className="w-full h-auto object-cover object-bottom translate-y-[2px]"
              />
            </div>

            {/* Close Icon Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-5 top-5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#DCD6CC] bg-[#FAF7F2]/90 text-[#3F4E42] shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-black hover:scale-105 active:scale-95"
              aria-label="Close dialog"
            >
              <X size={15} />
            </button>

            {/* Content Container (z-10 ensures content is above background waves) */}
            <div className="relative z-10 flex flex-col items-center w-full pt-1 pb-4">
              {/* Brand Header */}
              <div className="flex flex-col items-center mb-3">
                <img
                  src={modalLogoMark}
                  alt="Home Rituals Motif"
                  className="h-6 w-auto object-contain mb-1 opacity-90 select-none"
                />
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-[1px] bg-[#C5A880]/70" />
                  <span className="font-serif tracking-[0.24em] text-[10.5px] font-semibold text-[#203623] uppercase select-none">
                    HOME RITUALS
                  </span>
                  <div className="w-7 h-[1px] bg-[#C5A880]/70" />
                </div>
              </div>

              {/* Exclusive Welcome Badge */}
              <div className="inline-flex items-center justify-center px-3.5 py-0.5 rounded-full border border-[#8FA782]/60 bg-[#EDF3EC] text-[#204023] text-[10px] font-bold tracking-[0.18em] uppercase mb-3 shadow-[0_2px_8px_-2px_rgba(32,64,35,0.08)] select-none">
                EXCLUSIVE WELCOME
              </div>

              {/* Headline with Italic Exclusive & Crisp Vector Flourish Swoop */}
              <div className="relative flex flex-col items-center">
                <h2
                  className="text-[29px] sm:text-[33px] font-normal text-[#17301B] tracking-tight leading-[1.18]"
                  style={{ fontFamily: 'Playfair Display, serif' }}
                >
                  Unlock <span className="italic font-normal text-[#1E3E23]">Exclusive</span> Offers
                </h2>
                <div className="w-full flex justify-end pr-1 sm:pr-2 -mt-1 mb-1 pointer-events-none select-none">
                  <svg
                    viewBox="0 0 310 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-[170px] sm:w-[190px] h-[13px] sm:h-[15px] text-[#224626]"
                  >
                    <path
                      d="M 4 8 C 80 4, 180 4.5, 260 10.5 C 285 12.5, 302 16, 308 17 C 298 15.5, 280 12, 255 10 C 175 4, 80 4, 4 8 Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>

              {/* Subtitle */}
              <p className="mt-1.5 text-[12px] sm:text-[12.5px] leading-relaxed text-[#566558] max-w-[325px]">
                {AUTH_POPUP_TEXT}
              </p>

              {/* 3-Column Benefits Row */}
              <div className="mt-4 grid grid-cols-3 divide-x divide-[#DDD6CC] border-y border-[#E7E1D6]/80 py-3 w-full max-w-[365px]">
                {/* Column 1: Member-Only Offers */}
                <div className="flex flex-col items-center justify-center text-center px-1">
                  <div className="mb-1 text-[#214327]">
                    <svg
                      className="w-4.5 h-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.65"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-[10.5px] font-semibold text-[#1D3121] leading-tight">
                    Member-Only<br />Offers
                  </span>
                </div>

                {/* Column 2: Personalized Suggestions */}
                <div className="flex flex-col items-center justify-center text-center px-1">
                  <div className="mb-1 text-[#214327]">
                    <Bookmark size={18} strokeWidth={1.65} />
                  </div>
                  <span className="text-[10px] sm:text-[10.5px] font-semibold text-[#1D3121] leading-tight">
                    Personalized<br />Suggestions
                  </span>
                </div>

                {/* Column 3: Early Access to New Arrivals */}
                <div className="flex flex-col items-center justify-center text-center px-1">
                  <div className="mb-1 text-[#214327]">
                    <Tag size={18} strokeWidth={1.65} />
                  </div>
                  <span className="text-[10px] sm:text-[10.5px] font-semibold text-[#1D3121] leading-tight">
                    Early Access<br />to New Arrivals
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 w-full space-y-2.5">
                {/* Login Button */}
                <button
                  type="button"
                  onClick={() => handleAction('/login')}
                  className="group relative flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#204327] via-[#1B3C22] to-[#15341C] py-3.5 px-6 text-white text-[15px] font-medium shadow-[0_12px_24px_-4px_rgba(20,50,25,0.4)] transition-all hover:brightness-110 hover:shadow-[0_14px_28px_-4px_rgba(20,50,25,0.5)] active:scale-[0.98]"
                >
                  <span>Login</span>
                  <ArrowRight className="absolute right-6 w-4 h-4 text-white transition-transform duration-200 group-hover:translate-x-1" />
                </button>

                {/* Create Account Button */}
                <button
                  type="button"
                  onClick={() => handleAction('/register')}
                  className="w-full rounded-full border border-[#1E3E24] bg-white/70 py-3.5 px-6 text-[15px] font-medium text-[#1E3E24] shadow-sm transition-all hover:bg-white hover:border-[#143319] hover:shadow active:scale-[0.98]"
                >
                  Create Account
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TimedAuthPopup;
