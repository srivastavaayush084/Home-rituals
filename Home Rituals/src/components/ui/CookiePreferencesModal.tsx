import { useState, useEffect } from 'react';
import { X, Shield, BarChart3, Target, Check } from 'lucide-react';
import { getStoredConsent, saveConsent } from '../../utils/analytics';

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CookiePreferencesModal({ isOpen, onClose }: CookiePreferencesModalProps) {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getStoredConsent();
      if (existing) {
        setAnalytics(Boolean(existing.analytics));
        setMarketing(Boolean(existing.marketing));
      } else {
        setAnalytics(false);
        setMarketing(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveConsent({ analytics, marketing });
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 600);
  };

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
    setAnalytics(true);
    setMarketing(true);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 600);
  };

  const handleRejectAll = () => {
    saveConsent({ analytics: false, marketing: false });
    setAnalytics(false);
    setMarketing(false);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-preferences-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-[#FAF8F5] text-stone-900 shadow-2xl border border-stone-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-5 bg-[#F4EFEA]">
          <div>
            <h2 id="cookie-preferences-title" className="text-xl font-serif font-medium tracking-tight text-stone-900">
              Cookie Preferences
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Customize how Home Rituals manages your privacy and browser cookies.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cookie preferences"
            className="rounded-full p-2 text-stone-500 hover:bg-stone-200/60 hover:text-stone-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content categories */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Category 1: Essential */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-stone-100 p-2 text-stone-700">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Essential Cookies</h3>
                  <p className="text-xs text-stone-500">Security, session integrity &amp; shopping cart</p>
                </div>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-stone-700">
                Always Active
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-stone-600">
              Required for basic website functions, secure authentication sessions, CSRF protection,
              and cart persistence. These cannot be switched off.
            </p>
          </div>

          {/* Category 2: Analytics */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-50 p-2 text-emerald-800">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Analytics &amp; Performance</h3>
                  <p className="text-xs text-stone-500">Google Analytics 4 &amp; user experience insights</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-stone-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#0B8F3C] peer-checked:after:translate-x-full peer-focus:outline-none"></div>
              </label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-stone-600">
              Helps us aggregate anonymous visitor counts, measure traffic sources, and identify popular
              curations to improve platform reliability.
            </p>
          </div>

          {/* Category 3: Marketing */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-amber-50 p-2 text-amber-800">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Marketing &amp; Targeting</h3>
                  <p className="text-xs text-stone-500">Personalized offers &amp; partner campaigns</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-stone-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#0B8F3C] peer-checked:after:translate-x-full peer-focus:outline-none"></div>
              </label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-stone-600">
              Used to deliver relevant product recommendations and evaluate campaign effectiveness
              across digital touchpoints.
            </p>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-stone-200 bg-[#F4EFEA] px-6 py-4">
          <button
            type="button"
            onClick={handleRejectAll}
            className="w-full sm:w-auto text-xs font-semibold uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors py-2"
          >
            Reject Non-Essential
          </button>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex-1 sm:flex-initial rounded-full border border-stone-300 bg-white px-5 py-2 text-xs font-medium tracking-wide text-stone-800 hover:bg-stone-50 transition-colors shadow-sm"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0B8F3C] px-5 py-2 text-xs font-medium tracking-wide text-white hover:bg-[#097330] transition-colors shadow-sm"
            >
              {savedToast ? <Check size={14} /> : null}
              {savedToast ? 'Saved' : 'Save Choices'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
