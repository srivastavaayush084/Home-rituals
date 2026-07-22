import React, { useState } from 'react';
import { apiRequest } from '../../utils/apiClient';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setSent(false);

    try {
      await apiRequest('/api/newsletter', 'POST', { email });
      setSent(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Newsletter subscription failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-[18px] border border-[#e8efe7] bg-white p-6 text-center shadow-sm">
      <h3 className="text-xl font-semibold text-[#1a1a1a]">Stay Updated with Cleaning Tips</h3>
      <p className="mt-2 text-sm text-[#666666]">Get expert home care tips, exclusive offers, and new product launches delivered straight to your inbox.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          type="email"
          className="w-full rounded-full border border-[#e8efe7] px-4 py-3 text-sm"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto rounded-full bg-[#0B8F3C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#097b33] disabled:bg-gray-300"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>

      {sent && <div className="mt-4 text-sm text-[#0B8F3C]">Thanks — check your inbox! 🎉</div>}
      {error && <div className="mt-4 text-sm text-red-500">{error}</div>}
    </div>
  );
}

export default Newsletter;
