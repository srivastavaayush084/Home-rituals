import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid w-full gap-8 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] bg-[#EFE9DF] p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-black">Welcome back</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>Sign in to your ritual account.</h1>
          <p className="mt-4 text-lg leading-8 text-[#6f6f6f]">Track orders, save favorites, and enjoy a more personal experience.</p>
        </div>
        <div className="p-2 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3"
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3"
              placeholder="Password"
              required
            />
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <div className="flex flex-col gap-2 pt-2 text-sm text-[#6f6f6f]">
              <p>Need an account? <Link to="/register" className="font-semibold text-black hover:underline">Create one</Link></p>
              <p><Link to="/forgot-password" style={{ color: '#0B8F3C' }} className="hover:underline">Forgot your password?</Link></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
