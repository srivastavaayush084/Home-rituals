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

export function PaytmDemoPage() {
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
    { title: '2. Backend Paytm Transaction Initiation (/api/create-order)', status: 'pending' },
    { title: '3. Paytm All-in-One Checkout JS / Staging Payment UI', status: 'pending' },
    { title: '4. Server-to-Server (S2S) Status Verification (/api/payments/verify)', status: 'pending' }
  ]);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!token) {
      setError('You must be logged in to access the payment demo. Redirecting...');
      const timer = setTimeout(() => {
        navigate('/login', { state: { from: '/paytm-demo' } });
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
      { title: '2. Backend Paytm Transaction Initiation (/api/create-order)', status: 'pending' },
      { title: '3. Paytm All-in-One Checkout JS / Staging Payment UI', status: 'pending' },
      { title: '4. Server-to-Server (S2S) Status Verification (/api/payments/verify)', status: 'pending' }
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
      const addressId = addresses[0]?.id || 'default_demo_address';
      updateStep(0, 'success', `Amount: ₹${amount.toFixed(2)}, User: ${user?.name || 'Customer'}`);
      updateStep(1, 'active');

      // Step 2: Post to `/api/create-order`
      const orderResponse = await apiRequest<any>(
        '/api/create-order',
        'POST',
        { addressId }
      );

      const orderId = orderResponse.orderId || orderResponse.order_id;
      const txnToken = orderResponse.txnToken;
      const mid = orderResponse.mid;
      const paytmHost = orderResponse.paytmHost || 'https://securegw-stage.paytm.in';

      updateStep(1, 'success', `Paytm Order ID: ${orderId} | Token: ${txnToken?.substring(0, 16)}...`);
      updateStep(2, 'active');

      // Step 3: Trigger CheckoutJS
      const scriptUrl = `${paytmHost}/merchantpgpui/checkoutjs/merchants/${mid}.js`;
      await loadScript(scriptUrl);

      if ((window as any).Paytm && (window as any).Paytm.CheckoutJS) {
        const config = {
          root: '',
          flow: 'DEFAULT',
          data: {
            orderId: orderId,
            token: txnToken,
            tokenType: 'TXN_TOKEN',
            amount: String(amount),
          },
          merchant: {
            mid: mid,
            name: 'Home Rituals (Staging)',
            redirect: false,
          },
          handler: {
            notifyCurrencyCode: function () {},
            transactionStatus: async function (paymentStatus: any) {
              console.log('[Paytm Demo] paymentStatus callback:', paymentStatus);
              updateStep(2, 'success', `Payment Window Closed. Status: ${paymentStatus.STATUS || 'Completed'}`);
              updateStep(3, 'active');

              try {
                // Step 4: Verify payment status via server S2S
                const verifyResult = await apiRequest<any>('/api/payments/verify', 'POST', {
                  orderId,
                  addressId,
                  checksum: paymentStatus.CHECKSUMHASH,
                });

                updateStep(3, 'success', `Verified S2S Status: ${verifyResult.data?.status || 'TXN_SUCCESS'}`);
                setSuccess(true);
                setLoading(false);
              } catch (verifyErr: any) {
                updateStep(3, 'failed', verifyErr.message || 'Payment verification failed');
                setError(`Verification failed: ${verifyErr.message}`);
                setLoading(false);
              }
            },
          },
        };

        try {
          await (window as any).Paytm.CheckoutJS.init(config);
          (window as any).Paytm.CheckoutJS.invoke();
        } catch (initErr: any) {
          updateStep(2, 'failed', initErr.message || 'CheckoutJS invoke error');
          setError(`Checkout launch failed: ${initErr.message}`);
          setLoading(false);
        }
      } else {
        updateStep(2, 'failed', 'CheckoutJS SDK failed to load from Paytm CDN');
        setError('Paytm CheckoutJS could not be loaded. Please check your network or adblocker.');
        setLoading(false);
      }
    } catch (err: any) {
      updateStep(1, 'failed', err.message || 'Error occurred while initiating Paytm transaction');
      setError(`Initiation failed: ${err.message || 'Could not connect to backend.'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        
        {/* Sleek Gradient Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 to-blue-600 p-8 shadow-xl mb-8">
          <div className="relative z-10">
            <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Paytm Staging Console
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Paytm Payment Gateway Testing Portal
            </h1>
            <p className="mt-2 text-sky-100 max-w-xl text-sm">
              Sandbox testing console for Paytm All-in-One Payment Gateway. Test transaction initiation, Checksum generation, CheckoutJS modals, and Server-to-Server status verification.
            </p>
          </div>
          <div className="absolute right-0 top-0 h-48 w-48 -translate-y-8 translate-x-8 rounded-full bg-white/10 blur-xl"></div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          
          {/* Form Configuration Card (Left) */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-md hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500"></span>
              Payment Settings
            </h2>

            {error && (
              <div className="mb-6 rounded-2xl bg-red-50 p-4 border border-red-100 text-sm text-red-600 flex items-start gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-2xl bg-emerald-50 p-4 border border-emerald-100 text-sm text-emerald-700 font-medium">
                🎉 Congratulations! Paytm transaction was verified successfully via S2S API.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Amount (in INR)
                </label>
                <div className="relative rounded-2xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition overflow-hidden">
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
                  Paytm Test/Staging transactions use INR currency.
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition"
                />
              </div>

              {/* Paytm Staging Info */}
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-800 space-y-1">
                <p className="font-semibold text-sky-900">Paytm Staging Environment Guide:</p>
                <p>• Gateway Host: <code className="bg-sky-100 px-1 rounded text-sky-900">securegw-stage.paytm.in</code></p>
                <p>• Website Name: <code className="bg-sky-100 px-1 rounded text-sky-900">WEBSTAGING</code></p>
                <p>• Use Paytm test credentials from your developer dashboard to complete staging payments.</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePay}
                  disabled={loading || !token || amount <= 0}
                  className="w-full relative overflow-hidden group rounded-full bg-sky-600 py-4 font-semibold text-white shadow-md hover:bg-sky-500 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing via Paytm...
                      </>
                    ) : (
                      <>
                        Pay ₹{amount.toFixed(2)} with Paytm Staging
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
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></span>
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
                        <div className="h-5 w-5 rounded-full bg-sky-500/20 border border-sky-500 flex items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping"></span>
                        </div>
                      )}
                      {step.status === 'success' && (
                        <div className="h-5 w-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs">
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
                      <p className={`text-sm font-semibold ${step.status === 'active' ? 'text-sky-400' : step.status === 'success' ? 'text-slate-100' : step.status === 'failed' ? 'text-rose-400' : 'text-slate-500'}`}>
                        {step.title}
                      </p>
                      {step.message && (
                        <p className={`mt-1 text-xs font-mono break-all leading-relaxed ${step.status === 'success' ? 'text-slate-400' : step.status === 'failed' ? 'text-rose-300' : 'text-sky-300'}`}>
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

export default PaytmDemoPage;
