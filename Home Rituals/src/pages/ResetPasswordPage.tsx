import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useApp();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid w-full gap-8 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] bg-[#44D62C] p-8 text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-white font-bold">New Password</p>
          <h1 className="mt-3 text-3xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Create your new password.</h1>
          <p className="mt-4 text-lg leading-8 text-white/80">Choose a secure password to protect your account and resume your rituals.</p>
        </div>
        <div className="p-2 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700 border border-green-100">
                Password updated successfully! Redirecting you to login... 🚀
              </div>
            )}
            {!token && (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700 border border-amber-100">
                No reset token was found in the link. Please request a new link.
              </div>
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3"
              placeholder="New password"
              required
              disabled={success || !token}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3"
              placeholder="Confirm new password"
              required
              disabled={success || !token}
            />
            <Button className="w-full" type="submit" disabled={loading || success || !token}>
              {loading ? 'Updating password...' : 'Update password'}
            </Button>
            <div className="pt-2 text-sm text-[#6f6f6f]">
              Back to <Link to="/login" className="font-semibold text-black hover:underline">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
