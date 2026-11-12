import { useState, useEffect } from 'react';
import { Cookie, Settings, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStoredConsent, saveConsent } from '../../utils/analytics';
import { CookiePreferencesModal } from './CookiePreferencesModal';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Only show if consent has not been recorded yet
    const stored = getStoredConsent();
    if (!stored) {
      // Short delay for smooth slide-in
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Listen for manual trigger (e.g. from footer link)
    const handleOpenModal = () => {
      setIsModalOpen(true);
    };
    window.addEventListener('open-cookie-preferences', handleOpenModal);
    return () => {
      window.removeEventListener('open-cookie-preferences', handleOpenModal);
    };
  }, []);

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
    setIsVisible(false);
  };

  const handleRejectNonEssential = () => {
    saveConsent({ analytics: false, marketing: false });
    setIsVisible(false);
  };

  const handleCustomize = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    // If user saved preferences from modal, hide the banner
    if (getStoredConsent()) {
      setIsVisible(false);
    }
  };

  return (
    <>
      {isVisible && (
        <aside
          aria-label="Cookie consent"
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-5 animate-in slide-in-from-bottom duration-300 pointer-events-none"
        >
          <div className="mx-auto max-w-5xl rounded-3xl bg-[#FAF8F5]/95 backdrop-blur-md border border-stone-300/80 p-5 sm:p-6 shadow-2xl pointer-events-auto text-stone-900">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* Text copy */}
              <div className="flex items-start gap-4 flex-1">
                <div className="hidden sm:flex rounded-2xl bg-[#EFE9DF] p-3 text-stone-700 flex-shrink-0">
                  <Cookie size={24} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-wide text-stone-900">
                      Your Privacy &amp; Cookie Choices
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                      <ShieldCheck size={11} /> GDPR &amp; DPDP Ready
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-stone-600">
                    We use cookies to maintain your shopping cart, ensure secure checkout, and analyze
                    our website performance. You can customize your preferences or decline non-essential
                    cookies at any time. Learn more in our{' '}
                    <Link
                      to="/privacy-policy"
                      className="underline font-medium text-stone-900 hover:text-[#0B8F3C] transition-colors"
                    >
                      Privacy &amp; Cookie Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCustomize}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 hover:text-stone-950 transition-colors cursor-pointer"
                >
                  <Settings size={13} />
                  <span>Customize</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-800 hover:bg-stone-50 transition-colors shadow-sm"
                >
                  Reject Non-Essential
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-full bg-[#0B8F3C] px-5 py-2 text-xs font-medium text-white hover:bg-[#097330] transition-colors shadow-sm inline-flex items-center gap-1"
                >
                  <span>Accept All</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Preferences Dialog */}
      <CookiePreferencesModal isOpen={isModalOpen} onClose={handleModalClose} />
    </>
  );
}
