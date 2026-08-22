import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';

export function ForgotPasswordPage() {
  const { forgotPassword } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid w-full gap-8 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] bg-[#EFE9DF] p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-black">Reset Password</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>Forgot your password?</h1>
          <p className="mt-4 text-lg leading-8 text-[#6f6f6f]">Enter your registered email address, and we will send you a link to reset your password.</p>
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
                If the email is registered, a password reset link has been sent. Please check your inbox. 🎉
              </div>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3"
              placeholder="Email address"
              required
              disabled={success}
            />
            <Button className="w-full" type="submit" disabled={loading || success}>
              {loading ? 'Sending link...' : 'Send reset link'}
            </Button>
            <div className="pt-2 text-sm text-[#6f6f6f]">
              Remember your password? <Link to="/login" className="font-semibold text-black hover:underline">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
