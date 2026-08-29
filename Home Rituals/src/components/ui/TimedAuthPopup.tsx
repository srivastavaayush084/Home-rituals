import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { X } from 'lucide-react';
import { Button } from './Button';

const AUTH_POPUP_DELAY = 10000; // 10 seconds
const AUTH_POPUP_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const AUTH_POPUP_TITLE = "Unlock Exclusive Offers 🎁";
const AUTH_POPUP_TEXT = "Sign in or create an account to discover special offers, personalized recommendations.";

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
    if (timeSinceLastShown < AUTH_POPUP_COOLDOWN) {
      return;
    }

    // Set 10-second delay timer
    const timer = setTimeout(() => {
      // Re-verify conditions right before opening to prevent edge cases
      const currentPath = window.location.pathname;
      if (!user && !isAuthLoading && !authPages.includes(currentPath)) {
        setIsOpen(true);
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

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 py-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-md flex-col items-center rounded-[28px] border border-stone-200 bg-white p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:bg-stone-100 hover:scale-105"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        {/* Dynamic Promotional Content */}
        <div className="mt-4 flex flex-col items-center">
          <div className="text-4xl select-none">🎁</div>
          <h2 className="mt-4 text-2xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>
            {AUTH_POPUP_TITLE}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5f5f5f]">
            {AUTH_POPUP_TEXT}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 w-full space-y-3">
          <Button
            onClick={() => handleAction('/login')}
            className="w-full py-3"
          >
            Login
          </Button>
          <button
            onClick={() => handleAction('/register')}
            className="w-full py-2.5 text-sm font-semibold text-stone-600 hover:text-black hover:underline transition"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default TimedAuthPopup;
