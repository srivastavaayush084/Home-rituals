import { useState } from 'react';
import { Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../utils/apiClient';

export function EmailVerificationBanner() {
  const { user, showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Never show verification banner for admin accounts or verified users
  if (!user || !user.email || user.emailVerified || user.role === 'ADMIN') {
    return null;
  }

  const handleResend = async () => {
    if (loading || sent) return;
    setLoading(true);
    try {
      await apiRequest('/api/auth/resend-verification', 'POST', { email: user.email });
      setSent(true);
      showToast('Verification email sent! Please check your inbox and spam folder.');
      setTimeout(() => setSent(false), 30000); // 30s cooldown
    } catch (err: any) {
      showToast(err.message || 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs sm:text-sm text-amber-950 dark:text-amber-100 flex flex-wrap items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          <strong className="font-semibold">Email verification required:</strong> Please verify{' '}
          <span className="font-mono underline underline-offset-2">{user.email}</span> to unlock checkout and order placement.
        </span>
      </div>
      <button
        type="button"
        onClick={handleResend}
        disabled={loading || sent}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition shadow-sm ${
          sent
            ? 'bg-emerald-600 text-white cursor-default'
            : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95 disabled:opacity-50'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Sending...
          </>
        ) : sent ? (
          <>
            <CheckCircle2 size={13} />
            Sent (check email)
          </>
        ) : (
          <>
            <Mail size={13} />
            Resend Link
          </>
        )}
      </button>
    </div>
  );
}
