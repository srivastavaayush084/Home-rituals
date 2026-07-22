import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(email, password, name);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid w-full gap-8 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] bg-[#44D62C] p-8 text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-white font-bold">Create account</p>
          <h1 className="mt-3 text-3xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Join the ritual circle.</h1>
          <p className="mt-4 text-lg leading-8 text-white/80">Receive updates, savings, and first access to the next collection.</p>
        </div>
        <div className="p-2 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3"
              placeholder="Full name"
              required
            />
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
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-sm text-[#6f6f6f] pt-2">
              Already have an account? <Link to="/login" className="font-semibold text-black hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
