import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { apiRequest } from '../utils/apiClient';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await apiRequest('/api/contact', 'POST', {
        name,
        email,
        subject,
        message,
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit contact message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-black">Contact</p>
          <h1 className="mt-2 text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>We’re here to help with every ritual.</h1>
          <p className="mt-4 text-lg leading-8 text-[#6f6f6f]">Reach out for product guidance, order support, or a simple hello. We believe thoughtful care deserves thoughtful conversation.</p>
          <div className="mt-8 grid gap-4">
            <Card className="p-5"><p className="text-sm font-semibold text-black">Email</p><p className="mt-2 text-[#242424]">hello@homerituals.com</p></Card>
            <Card className="p-5"><p className="text-sm font-semibold text-black">Call</p><p className="mt-2 text-[#242424]">+91 99999 11111</p></Card>
            <Card className="p-5"><p className="text-sm font-semibold text-black">Visit</p><p className="mt-2 text-[#242424]">Bombay House, Mumbai</p></Card>
          </div>
        </div>
        <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700 border border-green-100">
                Message sent successfully! Our team will get back to you soon. 🎉
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3"
                placeholder="Name"
                required
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3"
                placeholder="Email"
                required
              />
            </div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-full border border-black/10 bg-[#FAFAF8] px-4 py-3"
              placeholder="Subject"
              required
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[140px] w-full rounded-[24px] border border-black/10 bg-[#FAFAF8] px-4 py-3"
              placeholder="Tell us about your concern"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#44D62C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3ebe27] disabled:bg-gray-300"
            >
              {loading ? 'Sending message...' : 'Send message'}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-16">
        <div className="rounded-[32px] border border-black/5 bg-[#EFE9DF] p-8 max-w-4xl mx-auto">
          <p className="text-sm uppercase tracking-[0.35em] text-black font-semibold">Frequently Asked Questions</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3 text-sm text-[#5f5f5f]">
            <div className="bg-white/60 p-5 rounded-[20px] border border-black/5">
              <p className="font-semibold text-[#242424] text-base">Do you ship internationally?</p>
              <p className="mt-2 leading-relaxed">Yes, we deliver across India and select global regions.</p>
            </div>
            <div className="bg-white/60 p-5 rounded-[20px] border border-black/5">
              <p className="font-semibold text-[#242424] text-base">Are the products safe around pets?</p>
              <p className="mt-2 leading-relaxed">Most formulas are pet-friendly and clearly labeled for ease.</p>
            </div>
            <div className="bg-white/60 p-5 rounded-[20px] border border-black/5">
              <p className="font-semibold text-[#242424] text-base">Can I subscribe to refills?</p>
              <p className="mt-2 leading-relaxed">Absolutely. We offer recurring refills for everyday essentials.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
