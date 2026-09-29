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
  const { token, user, addresses, fetchAddresses } = useApp();

  const [amount, setAmount] = useState<number>(5.00); // ₹5.00
  const [description, setDescription] = useState<string>('Test Hygiene Essentials Order');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Checkout Lifecycle Logging
  const [steps, setSteps] = useState<StepLog[]>([
    { title: '1. Prepare Order Parameters', status: 'pending' },
    { title: '2. Backend Razorpay Order Creation (/api/payments/razorpay/create-order)', status: 'pending' },
    { title: '3. Official Razorpay Checkout Modal Launch', status: 'pending' },
    { title: '4. Server-Side Cryptographic Signature Verification (/api/payments/razorpay/verify)', status: 'pending' }
  ]);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!token) {
      setError('You must be logged in to access the payment demo. Redirecting...');
      const timer = setTimeout(() => {
        navigate('/login', { state: { from: '/razorpay-demo' } });
      }, 3000);
      return () => clearTimeout(timer);
    }
    fetchAddresses();
  }, [token, navigate]);

  const updateStep = (index: number, status: 'pending' | 'active' | 'success' | 'failed', message?: string) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status, message } : s));
  };

  const resetSteps = () => {
    setSteps([
      { title: '1. Prepare Order Parameters', status: 'pending' },
      { title: '2. Backend Razorpay Order Creation (/api/payments/razorpay/create-order)', status: 'pending' },
      { title: '3. Official Razorpay Checkout Modal Launch', status: 'pending' },
      { title: '4. Server-Side Cryptographic Signature Verification (/api/payments/razorpay/verify)', status: 'pending' }
    ]);
    setError(null);
    setSuccess(false);
  };

  const handlePay = async () => {
    if (amount <= 0) {
      setError('Minimum transaction amount is ₹1.00');
      return;
    }

    setLoading(true);
    resetSteps();

    try {
      // Step 1: Prepare order params
      const addressId = addresses[0]?.id;
      if (!addressId) {
        throw new Error('Please add a shipping address in your profile before testing checkout.');
      }

      updateStep(0, 'success', `Amount: ₹${amount.toFixed(2)}, User: ${user?.name || 'Customer'}, Address ID: ${addressId}`);
      updateStep(1, 'active');

      // Step 2: Post to `/api/payments/razorpay/create-order`
      const orderResponse = await apiRequest<any>(
        '/api/payments/razorpay/create-order',
        'POST',
        { addressId }
      );

      const orderData = orderResponse.data || orderResponse;
      const orderId = orderData.orderId || orderData.order_id;
      const amountInPaise = orderData.amount;
      const keyId = orderData.keyId;

      if (!orderId || !keyId) {
        throw new Error('Server returned invalid order response. Missing orderId or keyId.');
      }

      updateStep(1, 'success', `Razorpay Order ID: ${orderId} | Amount: ${amountInPaise} paise | Key ID: ${keyId}`);
      updateStep(2, 'active');

      // Step 3: Load & Trigger Razorpay Checkout
      const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');

      if (!scriptLoaded || !(window as any).Razorpay) {
        updateStep(2, 'failed', 'Razorpay Checkout script failed to load from CDN');
        throw new Error('Razorpay Checkout SDK could not be loaded. Please check your network or adblocker.');
      }

      const options = {
        key: keyId,
        amount: amountInPaise,
        currency: 'INR',
        name: 'Home Rituals (Sandbox)',
        description,
        order_id: orderId,
        prefill: {
          name: user?.name || 'Test User',
          email: user?.email || 'test@example.com',
          contact: user?.phone || '9999999999',
        },
        theme: {
          color: '#0B8F3C',
        },
        modal: {
          ondismiss: () => {
            updateStep(2, 'failed', 'Customer closed or dismissed the checkout modal without paying.');
            setLoading(false);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          updateStep(2, 'success', `Payment captured by Razorpay. Payment ID: ${response.razorpay_payment_id}`);
          updateStep(3, 'active');

          try {
            // Step 4: Verify payment signature via backend
            const verifyResult = await apiRequest<any>('/api/payments/razorpay/verify', 'POST', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              addressId,
            });

            const confirmedOrder = verifyResult?.order || verifyResult?.data?.order || verifyResult;
            updateStep(3, 'success', `Cryptographic signature verified! Order ID: ${confirmedOrder?.id || 'Confirmed'}`);
            setSuccess(true);
            setLoading(false);
          } catch (verifyErr: any) {
            updateStep(3, 'failed', verifyErr.message || 'Signature verification failed');
            setError(`Verification failed: ${verifyErr.message}`);
            setLoading(false);
          }
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on('payment.failed', (resp: any) => {
        updateStep(2, 'failed', resp.error?.description || 'Payment rejected by gateway');
        setError(`Payment failed: ${resp.error?.description}`);
        setLoading(false);
      });

      rzpInstance.open();
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 to-green-600 p-8 shadow-xl mb-8">
          <div className="relative z-10">
            <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Razorpay Sandbox Console
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Razorpay Payment Gateway Testing Portal
            </h1>
            <p className="mt-2 text-emerald-100 max-w-xl text-sm">
              Sandbox testing console for Razorpay Checkout. Test secure server-side order creation, modal payment processing, HMAC-SHA256 signature verification, and webhook notifications.
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
                🎉 Congratulations! Razorpay payment was verified successfully and order finalized.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Amount (in INR)
                </label>
                <div className="relative rounded-2xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition overflow-hidden">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(Number(e.target.value));
                      setError(null);
                    }}
                    placeholder="e.g. 5.00"
                    disabled={loading || !token}
                    className="w-full bg-transparent px-4 py-3 text-slate-800 outline-none font-mono"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                    ₹{amount.toFixed(2)}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Razorpay Sandbox transactions use INR currency ({Math.round(amount * 100)} paise).
                </p>
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

              {/* Razorpay Test Mode Info */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs text-emerald-800 space-y-1">
                <p className="font-semibold text-emerald-900">Razorpay Sandbox Environment Guide:</p>
                <p>• Key ID Prefix: <code className="bg-emerald-100 px-1 rounded text-emerald-900 font-mono">rzp_test_...</code></p>
                <p>• Checkout: UPI (success@razorpay), Cards (4111 1111 1111 1111), NetBanking.</p>
                <p>• Signature: Verified server-side with HMAC-SHA256.</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePay}
                  disabled={loading || !token || amount <= 0}
                  className="w-full relative overflow-hidden group rounded-full bg-[#0B8F3C] py-4 font-semibold text-white shadow-md hover:bg-[#0a7a33] active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing Razorpay Order...
                      </>
                    ) : (
                      <>
                        Pay ₹{amount.toFixed(2)} with Razorpay Test Mode
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
                <span className="h-2 w-2 rounded-full bg-[#44D62C] animate-pulse"></span>
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
                          <span className="h-2 w-2 rounded-full bg-[#44D62C] animate-ping"></span>
                        </div>
                      )}
                      {step.status === 'success' && (
                        <div className="h-5 w-5 rounded-full bg-[#0B8F3C] text-white flex items-center justify-center text-xs">
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
