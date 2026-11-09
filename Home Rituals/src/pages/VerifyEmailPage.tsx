import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Mail, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { apiRequest } from '../utils/apiClient';
import { useApp } from '../context/AppContext';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, refreshUser, showToast } = useApp();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(token ? 'loading' : 'idle');
  const [message, setMessage] = useState<string>('');

  // Resend form state
  const [resendEmail, setResendEmail] = useState<string>(user?.email || '');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      return;
    }

    let isMounted = true;
    async function verify() {
      setStatus('loading');
      try {
        await apiRequest<{ emailVerified: boolean }>('/api/auth/verify-email', 'POST', { token });
        if (!isMounted) return;
        setStatus('success');
        setMessage('Your email address has been successfully verified! You can now checkout and place orders.');
        // Refresh authenticated user state in background
        if (user) {
          refreshUser();
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('error');
        setMessage(err?.message || 'The verification link is invalid or has expired.');
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || !resendEmail.trim()) {
      showToast('Please enter your email address');
      return;
    }

    setResending(true);
    setResendSuccess(false);
    try {
      await apiRequest('/api/auth/resend-verification', 'POST', { email: resendEmail.trim() });
      setResendSuccess(true);
      showToast('If registered, a verification link has been sent to your email.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to send verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#fbfbf8] dark:bg-[#07130e]">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c2017] rounded-3xl p-8 sm:p-10 shadow-xl border border-stone-200/80 dark:border-emerald-950/60 text-center">
        {status === 'loading' && (
          <div className="py-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[#0B8F3C]">
              <Loader2 size={36} className="animate-spin" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
              Verifying Your Email...
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Please wait while we validate your verification token.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
              Email Verified Successfully!
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-8 max-w-sm mx-auto">
              {message}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#0B8F3C] hover:bg-[#097330] text-white text-sm font-semibold shadow-md transition hover:-translate-y-0.5"
              >
                Continue Shopping
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-900 transition"
              >
                Go to Account
              </Link>
            </div>
          </div>
        )}

        {(status === 'error' || status === 'idle') && (
          <div className="py-4">
            <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
              status === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-[#0B8F3C]'
            }`}>
              {status === 'error' ? <XCircle size={36} /> : <Mail size={36} />}
            </div>

            <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
              {status === 'error' ? 'Verification Link Expired' : 'Verify Your Email'}
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-8 max-w-sm mx-auto">
              {status === 'error'
                ? message || 'This verification link is invalid, expired, or has already been used. Request a new link below.'
                : 'Enter your account email address below to receive a new verification link valid for 24 hours.'}
            </p>

            <form onSubmit={handleResend} className="space-y-4 text-left max-w-sm mx-auto">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B8F3C]/30 focus:border-[#0B8F3C]"
                  />
                </div>
              </div>

              {resendSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300">
                  Verification email sent! Please check your inbox and click the link to verify your account.
                </div>
              )}

              <button
                type="submit"
                disabled={resending}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#0B8F3C] hover:bg-[#097330] text-white text-sm font-semibold shadow-md transition disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Resend Verification Link
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-stone-100 dark:border-stone-800 flex justify-center gap-4 text-xs text-stone-500">
              <Link to="/login" className="hover:underline">Back to Login</Link>
              <span>•</span>
              <Link to="/shop" className="hover:underline">Shop Products</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default VerifyEmailPage;
