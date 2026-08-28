import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../utils/apiClient';

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface StepLog {
  title: string;
  status: 'pending' | 'active' | 'success' | 'failed';
  message?: string;
}

export function RazorpayDemoPage() {
  const navigate = useNavigate();
  const { token, user } = useApp();

  const [amount, setAmount] = useState<number>(500); // 500 paise = ₹5.00
  const [receipt, setReceipt] = useState<string>(`rcpt_test_${Date.now().toString().slice(-6)}`);
  const [description, setDescription] = useState<string>('Test Premium Experience Access');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Checkout Lifecycle Logging
  const [steps, setSteps] = useState<StepLog[]>([
    { title: '1. Prepare Order Parameters', status: 'pending' },
    { title: '2. Backend Razorpay Order Creation (/api/create-order)', status: 'pending' },
    { title: '3. Customer Standard Checkout Modal', status: 'pending' },
    { title: '4. Backend Payment Verification (/api/verify-payment)', status: 'pending' }
  ]);

  useEffect(() => {
    // Dynamically inject Razorpay Web Checkout JS script
    loadScript('https://checkout.razorpay.com/v1/checkout.js');
  }, []);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!token) {
      setError('You must be logged in to access the payment demo. Redirecting...');
      const timer = setTimeout(() => {
        navigate('/login', { state: { from: '/razorpay-demo' } });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [token, navigate]);

  const updateStep = (index: number, status: 'pending' | 'active' | 'success' | 'failed', message?: string) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status, message } : s));
  };

  const resetSteps = () => {
    setSteps([
      { title: '1. Prepare Order Parameters', status: 'pending' },
      { title: '2. Backend Razorpay Order Creation (/api/create-order)', status: 'pending' },
      { title: '3. Customer Standard Checkout Modal', status: 'pending' },
      { title: '4. Backend Payment Verification (/api/verify-payment)', status: 'pending' }
    ]);
    setError(null);
    setSuccess(false);
  };

  const handlePay = async () => {
    if (amount < 100) {
      setError('Minimum transaction amount is 100 paise (₹1.00)');
      return;
    }

    setLoading(true);
    resetSteps();

    try {
      // Step 1: Prepare order params
      updateStep(0, 'success', `Amount: ${amount} paise (₹${(amount / 100).toFixed(2)})`);
      updateStep(1, 'active');

      // Step 2: Post to `/api/create-order`
      const orderResponse = await apiRequest<{ order_id: string; amount: number; currency: string }>(
        '/api/create-order',
        'POST',
        { amount, currency: 'INR', receipt }
      );

      updateStep(1, 'success', `Razorpay Order ID: ${orderResponse.order_id}`);
      updateStep(2, 'active');

      // Step 3: Trigger Razorpay Checkout modal
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TVFFlhi0zkxalU';
      
      const options = {
        key: razorpayKey,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'Home Rituals Premium',
        description: description,
        order_id: orderResponse.order_id,
        handler: async function (response: any) {
          try {
            updateStep(2, 'success', `Payment Authorized! ID: ${response.razorpay_payment_id}`);
            updateStep(3, 'active');

            // Step 4: Send keys to `/api/verify-payment`
            await apiRequest('/api/verify-payment', 'POST', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            updateStep(3, 'success', 'Payment Signature Verified Successfully!');
            setSuccess(true);
            setLoading(false);
          } catch (verifyErr: any) {
            updateStep(3, 'failed', verifyErr.message || 'Signature mismatch or verification error');
            setError(`Verification failed: ${verifyErr.message || 'Payment signature mismatch.'}`);
            setLoading(false);
          }
        },
        prefill: {
          name: user?.name || 'Customer Name',
          email: user?.email || 'customer@example.com',
          contact: user?.phone || '9999999999'
        },
        theme: {
          color: '#44D62C'
        },
        modal: {
          ondismiss: function() {
            updateStep(2, 'failed', 'Payment Modal Dismissed by User');
            setError('Payment cancelled: User closed the payment window.');
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      
      // Handle payment failure event
      rzp.on('payment.failed', function (resp: any) {
        updateStep(2, 'failed', `Payment failed: ${resp.error.description}`);
        setError(`Payment failed: ${resp.error.description} (Code: ${resp.error.code})`);
        setLoading(false);
      });

      rzp.open();

    } catch (err: any) {
      updateStep(1, 'failed', err.message || 'Error occurred while creating Razorpay order');
      setError(`Order creation failed: ${err.message || 'Could not connect to backend.'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        
        {/* Sleek Gradient Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-green-500 p-8 shadow-xl mb-8">
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Razorpay Standard Checkout Portal
            </h1>
            <p className="mt-2 text-emerald-100 max-w-xl text-sm">
              Sandbox testing console for Razorpay Checkout. Specify custom amounts, initiate the payment lifecycle, and verify signatures seamlessly.
            </p>
          </div>
          <div className="absolute right-0 top-0 h-48 w-48 -translate-y-8 translate-x-8 rounded-full bg-white/10 blur-xl"></div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          
          {/* Form Configuration Card (Left) */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-md hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Payment Settings
            </h2>

            {error && (
              <div className="mb-6 rounded-2xl bg-red-50 p-4 border border-red-100 text-sm text-red-600 flex items-start gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-2xl bg-emerald-50 p-4 border border-emerald-100 text-sm text-emerald-700 font-medium">
                🎉 Congratulations! Payment was verified successfully.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Amount (in Paise)
                </label>
                <div className="relative rounded-2xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition overflow-hidden">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(Number(e.target.value));
                      setError(null);
                    }}
                    placeholder="e.g. 500"
                    disabled={loading || !token}
                    className="w-full bg-transparent px-4 py-3 text-slate-800 outline-none font-mono"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                    ₹{(amount / 100).toFixed(2)}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Note: 100 paise = ₹1.00. Minimum amount is 100 paise.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Receipt ID (Receipt Reference)
                </label>
                <input
                  type="text"
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  disabled={loading || !token}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Item Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading || !token}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handlePay}
                  disabled={loading || !token || amount < 100}
                  className="w-full relative overflow-hidden group rounded-full bg-emerald-600 py-4 font-semibold text-white shadow-md hover:bg-emerald-500 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        Pay ₹{(amount / 100).toFixed(2)} with Razorpay
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Checkout Lifecycle Log Card (Right) */}
          <div className="rounded-3xl border border-black/5 bg-slate-900 p-6 shadow-md text-slate-300 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Checkout Lifecycle Log
              </h2>

              <div className="space-y-6">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="mt-1 flex items-center justify-center">
                      {step.status === 'pending' && (
                        <div className="h-5 w-5 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                          {idx + 1}
                        </div>
                      )}
                      {step.status === 'active' && (
                        <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                        </div>
                      )}
                      {step.status === 'success' && (
                        <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                          ✓
                        </div>
                      )}
                      {step.status === 'failed' && (
                        <div className="h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">
                          ✗
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${step.status === 'active' ? 'text-emerald-400' : step.status === 'success' ? 'text-slate-100' : step.status === 'failed' ? 'text-rose-400' : 'text-slate-500'}`}>
                        {step.title}
                      </p>
                      {step.message && (
                        <p className={`mt-1 text-xs font-mono break-all leading-relaxed ${step.status === 'success' ? 'text-slate-400' : step.status === 'failed' ? 'text-rose-300' : 'text-emerald-300'}`}>
                          {step.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
              <span>Status: {loading ? 'Running Transaction' : success ? 'Finished' : 'Waiting'}</span>
              <button
                onClick={resetSteps}
                className="text-slate-400 hover:text-white underline transition font-medium"
              >
                Clear Console
              </button>
            </div>
          </div>

        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-slate-500 hover:text-slate-800 text-sm font-medium transition inline-flex items-center gap-1">
            ← Back to Storefront
          </Link>
        </div>

      </div>
    </div>
  );
}

export default RazorpayDemoPage;
