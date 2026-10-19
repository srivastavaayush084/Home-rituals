import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { X, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { AnimatePresence, motion } from 'framer-motion';

const AUTH_POPUP_DELAY = 20000; // 20 seconds
const AUTH_POPUP_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const AUTH_POPUP_TITLE = "Unlock Exclusive Offers";
const AUTH_POPUP_TEXT = "Sign in or create an account to discover special offers, personalized recommendations, and member-only benefits.";

const COOLDOWN_KEY = 'home-rituals-auth-popup-last-shown';

export function TimedAuthPopup() {
  const { user, token } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Exclude authentication pages
  const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isAuthPage = authPages.includes(location.pathname);

  // Derive authentication loading state
  const isAuthLoading = token !== null && user === null;

  useEffect(() => {
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
    console.log('[TimedAuthPopup] Cooldown Check:', {
      lastShownDate: new Date(lastShown).toLocaleString(),
      timeSinceLastShownSeconds: Math.round(timeSinceLastShown / 1000),
      cooldownRemainingSeconds: Math.max(0, Math.round((AUTH_POPUP_COOLDOWN - timeSinceLastShown) / 1000)),
      isCooldownActive: timeSinceLastShown < AUTH_POPUP_COOLDOWN
    });

    if (timeSinceLastShown < AUTH_POPUP_COOLDOWN) {
      return;
    }

    console.log(`[TimedAuthPopup] Setting trigger timer for ${AUTH_POPUP_DELAY / 1000}s`);

    // Set 20-second delay timer
    const timer = setTimeout(() => {
      // Re-verify conditions right before opening to prevent edge cases
      const currentPath = window.location.pathname;
      if (!user && !isAuthLoading && !authPages.includes(currentPath)) {
        setIsOpen(true);
        console.log('[TimedAuthPopup] Popup triggered open, storing timestamp');
        // Safe write to localStorage immediately when popup triggers open
        try {
          localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        } catch (e) {
          console.warn('Failed to write to localStorage:', e);
        }
      }
    }, AUTH_POPUP_DELAY);

    // Clean up timeout on unmount or condition changes
    return () => clearTimeout(timer);
  }, [user, isAuthLoading, isAuthPage, location.pathname]);

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4 py-4 backdrop-blur-[2px]"
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
            className="relative flex w-full max-w-[420px] flex-col items-center rounded-[12px] border border-stone-200 bg-white p-8 text-center shadow-xl"
          >
            {/* Close Icon Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[6px] border border-stone-200 bg-stone-50 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8F3C]"
              aria-label="Close dialog"
            >
              <X size={15} />
            </button>

            {/* Dynamic Promotional Content */}
            <div className="mt-2 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#44D62C]/10 text-[#0B8F3C] text-[10px] font-bold uppercase tracking-wider mb-4 border border-[#44D62C]/20 select-none">
                <Sparkles size={11} className="text-[#0B8F3C]" /> Exclusive Welcome
              </div>
              <div className="text-4xl select-none leading-none mb-1">🎁</div>
              <h2 className="mt-3 text-2xl font-semibold text-[#223229] leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                {AUTH_POPUP_TITLE}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-500 max-w-[320px]">
                {AUTH_POPUP_TEXT}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-7 w-full space-y-2.5">
              <Button
                onClick={() => handleAction('/login')}
                className="w-full"
              >
                Login
              </Button>
              <button
                type="button"
                onClick={() => handleAction('/register')}
                className="w-full rounded-[6px] border border-stone-300 bg-white py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 hover:border-stone-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8F3C]"
              >
                Create Account
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TimedAuthPopup;

