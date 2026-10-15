import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AuthCardProps {
  initialMode?: 'signin' | 'signup';
}

export function AuthCard({ initialMode = 'signin' }: AuthCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, register } = useApp();

  const [isSignUp, setIsSignUp] = useState(
    location.pathname === '/register' || initialMode === 'signup'
  );

  // Sign In Form States
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Sign Up Form States
  const [name, setName] = useState('');
  const [regType, setRegType] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  // Redirect handling
  const requestedFrom = location.state?.from;
  const from =
    typeof requestedFrom === 'string' &&
    requestedFrom.startsWith('/') &&
    !requestedFrom.startsWith('//')
      ? requestedFrom
      : '/';

  // Automatically redirect away if already signed in
  useEffect(() => {
    if (user) {
      const destination = from === '/login' || from === '/register' ? '/profile' : from;
      navigate(destination, { replace: true });
    }
  }, [user, navigate, from]);

  // Sync mode when URL changes (e.g., browser back/forward)
  useEffect(() => {
    if (location.pathname === '/register') {
      setIsSignUp(true);
    } else if (location.pathname === '/login') {
      setIsSignUp(false);
    }
  }, [location.pathname]);

  // Sync mode changes with URL without full page reload
  const toggleMode = (targetSignUp: boolean) => {
    setIsSignUp(targetSignUp);
    setSignInError(null);
    setSignUpError(null);
    const targetUrl = targetSignUp ? '/register' : '/login';
    navigate(targetUrl, { replace: true, state: location.state });
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setSignInLoading(true);

    try {
      await login(emailOrPhone, signInPassword);
      navigate(from, { replace: true });
    } catch (err: any) {
      setSignInError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    setSignUpLoading(true);

    try {
      const emailValue = regType === 'email' ? email : null;
      const phoneValue = regType === 'phone' ? phone : null;
      await register(emailValue, phoneValue, signUpPassword, name);
      navigate(from, { replace: true });
    } catch (err: any) {
      setSignUpError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-[#091f17] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#10382b] via-[#091f17] to-[#05130e]">
      {/* Outer Luxury Card Shell */}
      <div className="relative w-full max-w-[960px] min-h-[580px] overflow-hidden rounded-[28px] sm:rounded-[34px] border border-[#2d4d3f]/40 bg-[#f6f1e8] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.45)]">
        
        {/* DESKTOP / TABLET SLIDING LAYOUT (>= 768px) */}
        <div className="hidden md:grid md:grid-cols-2 w-full min-h-[580px] relative">
          
          {/* LEFT SLOT: Sign In Form */}
          <div
            className={`flex flex-col justify-center px-10 py-10 lg:px-14 lg:py-12 transition-all duration-300 ${
              !isSignUp ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="max-w-[340px] w-full mx-auto">
              <h2 className="text-[32px] font-bold text-[#1a2621] tracking-tight mb-8">
                Sign in
              </h2>

              <form onSubmit={handleSignInSubmit} className="space-y-6">
                {signInError && (
                  <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                    {signInError}
                  </div>
                )}

                {/* Username or Email Input */}
                <div className="relative group">
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="Username or email"
                    required
                    className="w-full bg-transparent border-b border-[#dcd4c6] pb-2.5 pt-1 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758] transition-colors pr-8"
                  />
                  <div className="absolute right-0 bottom-2.5 text-[#9c9589] group-focus-within:text-[#b89758] transition-colors pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full bg-transparent border-b border-[#dcd4c6] pb-2.5 pt-1 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758] transition-colors pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-0 bottom-2.5 text-[#9c9589] hover:text-[#1a2621] transition-colors"
                    aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Options row */}
                <div className="flex items-center justify-between text-xs pt-1 text-[#6b6458]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#c8c0b3] text-[#0e2a22] focus:ring-[#0e2a22] accent-[#0e2a22]"
                    />
                    <span>Keep me signed in</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[#967846] hover:text-[#0e2a22] hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={signInLoading}
                  className="w-full mt-2 py-3.5 rounded-full bg-[#0d2e24] text-[#f7f4ee] font-medium text-sm tracking-wide shadow-md hover:bg-[#071d17] active:scale-[0.99] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {signInLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>

                {/* Switch link */}
                <div className="text-center text-xs text-[#787164] pt-3">
                  New to Home Rituals?{' '}
                  <button
                    type="button"
                    onClick={() => toggleMode(true)}
                    className="font-semibold text-[#1a2621] underline hover:text-[#0d2e24] transition-colors"
                  >
                    Create an account
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT SLOT: Create Account Form */}
          <div
            className={`flex flex-col justify-center px-10 py-10 lg:px-14 lg:py-12 transition-all duration-300 ${
              isSignUp ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="max-w-[340px] w-full mx-auto">
              <h2 className="text-[32px] font-bold text-[#1a2621] tracking-tight mb-6">
                Create account
              </h2>

              <form onSubmit={handleSignUpSubmit} className="space-y-5">
                {signUpError && (
                  <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                    {signUpError}
                  </div>
                )}

                {/* Full Name Input */}
                <div className="relative group">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    required
                    className="w-full bg-transparent border-b border-[#dcd4c6] pb-2.5 pt-1 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758] transition-colors pr-8"
                  />
                  <div className="absolute right-0 bottom-2.5 text-[#9c9589] group-focus-within:text-[#b89758] transition-colors pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                </div>

                {/* Email / Phone Toggle & Input */}
                <div>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setRegType('email')}
                      className={`text-[11px] font-medium tracking-wider uppercase pb-0.5 border-b transition-colors ${
                        regType === 'email'
                          ? 'border-[#0e2a22] text-[#0e2a22] font-semibold'
                          : 'border-transparent text-[#9c9589] hover:text-[#1a2621]'
                      }`}
                    >
                      Email
                    </button>
                    <span className="text-[#c8c0b3] text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => setRegType('phone')}
                      className={`text-[11px] font-medium tracking-wider uppercase pb-0.5 border-b transition-colors ${
                        regType === 'phone'
                          ? 'border-[#0e2a22] text-[#0e2a22] font-semibold'
                          : 'border-transparent text-[#9c9589] hover:text-[#1a2621]'
                      }`}
                    >
                      Mobile
                    </button>
                  </div>

                  <div className="relative group">
                    {regType === 'email' ? (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        className="w-full bg-transparent border-b border-[#dcd4c6] pb-2.5 pt-1 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758] transition-colors pr-8"
                      />
                    ) : (
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile phone number"
                        required
                        className="w-full bg-transparent border-b border-[#dcd4c6] pb-2.5 pt-1 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758] transition-colors pr-8"
                      />
                    )}
                    <div className="absolute right-0 bottom-2.5 text-[#9c9589] group-focus-within:text-[#b89758] transition-colors pointer-events-none">
                      {regType === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="relative group">
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="Password"
                      required
                      minLength={6}
                      className="w-full bg-transparent border-b border-[#dcd4c6] pb-2.5 pt-1 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758] transition-colors pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-0 bottom-2.5 text-[#9c9589] hover:text-[#1a2621] transition-colors"
                      aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength indicators matching video reference */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="flex gap-1">
                      <span className={`h-0.5 w-3 rounded-full transition-colors ${signUpPassword.length >= 2 ? 'bg-[#b89758]' : 'bg-[#ded6ca]'}`} />
                      <span className={`h-0.5 w-3 rounded-full transition-colors ${signUpPassword.length >= 5 ? 'bg-[#b89758]' : 'bg-[#ded6ca]'}`} />
                      <span className={`h-0.5 w-3 rounded-full transition-colors ${signUpPassword.length >= 8 ? 'bg-[#b89758]' : 'bg-[#ded6ca]'}`} />
                      <span className={`h-0.5 w-3 rounded-full transition-colors ${signUpPassword.length >= 10 ? 'bg-[#0e2a22]' : 'bg-[#ded6ca]'}`} />
                    </div>
                    <span className="text-[11px] text-[#8c8578] ml-1">Use 8 characters or more.</span>
                  </div>
                </div>

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={signUpLoading}
                  className="w-full mt-2 py-3.5 rounded-full bg-[#0d2e24] text-[#f7f4ee] font-medium text-sm tracking-wide shadow-md hover:bg-[#071d17] active:scale-[0.99] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {signUpLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>

                {/* Switch link */}
                <div className="text-center text-xs text-[#787164] pt-2">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => toggleMode(false)}
                    className="font-semibold text-[#1a2621] underline hover:text-[#0d2e24] transition-colors"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* SLIDING GREEN BRAND OVERLAY (The Masterpiece Motion Design) */}
          <motion.div
            initial={false}
            animate={{
              left: isSignUp ? '0%' : '44%',
              clipPath: isSignUp
                ? 'polygon(0% 0%, 78.5% 0%, 92.5% 100%, 0% 100%)'
                : 'polygon(0% 0%, 100% 0%, 100% 100%, 14% 100%)',
            }}
            transition={{
              duration: 0.75,
              ease: [0.65, 0, 0.35, 1], // Smooth luxury cubic-bezier ease
            }}
            className="absolute top-0 bottom-0 w-[56%] h-full z-20 pointer-events-none overflow-hidden bg-gradient-to-br from-[#0e3025] via-[#09231b] to-[#051711]"
            style={{
              willChange: 'left, clip-path',
              filter: isSignUp
                ? 'drop-shadow(12px 0 24px rgba(0,0,0,0.32))'
                : 'drop-shadow(-12px 0 24px rgba(0,0,0,0.32))',
            }}
          >
            {/* Subtle atmospheric ambient glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(197,168,128,0.12)_0%,transparent_60%)] pointer-events-none" />

            {/* Overlay Content with Seamless Crossfade & Slanted Padding */}
            <div
              className={`relative z-10 w-full h-full flex flex-col justify-center transition-all duration-500 ${
                isSignUp ? 'pl-10 pr-20 lg:pl-14 lg:pr-24' : 'pl-20 pr-10 lg:pl-24 lg:pr-14'
              }`}
            >
              <AnimatePresence mode="wait">
                {!isSignUp ? (
                  <motion.div
                    key="signin-brand-text"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                    className="text-left"
                  >
                    <img
                      src="/home-rituals-script-transparent.png"
                      alt="Home Rituals"
                      className="h-12 sm:h-14 lg:h-16 w-auto max-w-[220px] sm:max-w-[260px] object-contain mb-3 drop-shadow-[0_2px_12px_rgba(216,176,120,0.28)] select-none"
                    />
                    <h1
                      className="text-4xl lg:text-[48px] font-normal leading-[1.12] text-[#f7f4ee]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Welcome <br />
                      <span
                        className="italic font-medium text-[#d8b078] inline-block mt-0.5"
                        style={{
                          fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                          fontSize: '1.2em',
                          letterSpacing: '0.01em',
                          textShadow: '0 2px 14px rgba(216,176,120,0.22)',
                        }}
                      >
                        back.
                      </span>
                    </h1>
                    <p className="mt-4 text-[13px] lg:text-[14px] leading-relaxed text-[#9cb5a8] max-w-[280px]">
                      Your rituals, sacred spaces and soulful aromas are exactly where you left them.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup-brand-text"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                    className="text-left"
                  >
                    <img
                      src="/home-rituals-script-transparent.png"
                      alt="Home Rituals"
                      className="h-12 sm:h-14 lg:h-16 w-auto max-w-[220px] sm:max-w-[260px] object-contain mb-3 drop-shadow-[0_2px_12px_rgba(216,176,120,0.28)] select-none"
                    />
                    <h1
                      className="text-4xl lg:text-[48px] font-normal leading-[1.12] text-[#f7f4ee]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Start the <br />
                      <span
                        className="italic font-medium text-[#d8b078] inline-block mt-0.5"
                        style={{
                          fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                          fontSize: '1.2em',
                          letterSpacing: '0.01em',
                          textShadow: '0 2px 14px rgba(216,176,120,0.22)',
                        }}
                      >
                        first page.
                      </span>
                    </h1>
                    <p className="mt-4 text-[13px] lg:text-[14px] leading-relaxed text-[#9cb5a8] max-w-[280px]">
                      One account for every ritual, every board and every sacred space you own.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* MOBILE RESPONSIVE ADAPTATION (< 768px) */}
        <div className="md:hidden flex flex-col w-full">
          {/* Top Emerald Brand Banner */}
          <div className="relative bg-gradient-to-br from-[#0e3025] via-[#09231b] to-[#051711] px-6 py-8 text-center overflow-hidden flex flex-col items-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(197,168,128,0.15)_0%,transparent_60%)] pointer-events-none" />
            <img
              src="/home-rituals-script-transparent.png"
              alt="Home Rituals"
              className="h-10 sm:h-12 w-auto max-w-[200px] object-contain mb-2 drop-shadow-[0_2px_10px_rgba(216,176,120,0.28)] select-none mx-auto"
            />
            <h1
              className="text-3xl font-normal leading-tight text-[#f7f4ee]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {!isSignUp ? (
                <>
                  Welcome{' '}
                  <span
                    className="italic font-medium text-[#d8b078]"
                    style={{
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                      fontSize: '1.15em',
                    }}
                  >
                    back.
                  </span>
                </>
              ) : (
                <>
                  Start the{' '}
                  <span
                    className="italic font-medium text-[#d8b078]"
                    style={{
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                      fontSize: '1.15em',
                    }}
                  >
                    first page.
                  </span>
                </>
              )}
            </h1>
            <p className="mt-2 text-xs text-[#9cb5a8] max-w-xs mx-auto">
              {!isSignUp
                ? 'Your rituals, sacred spaces and soulful aromas are waiting.'
                : 'One account for every sacred ritual you own.'}
            </p>

            {/* Mobile Tab Switcher */}
            <div className="mt-5 inline-flex p-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/10">
              <button
                type="button"
                onClick={() => toggleMode(false)}
                className={`py-1.5 px-5 rounded-full text-xs font-semibold tracking-wider transition-all ${
                  !isSignUp ? 'bg-[#c5a880] text-[#0a241c] shadow' : 'text-white/70 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => toggleMode(true)}
                className={`py-1.5 px-5 rounded-full text-xs font-semibold tracking-wider transition-all ${
                  isSignUp ? 'bg-[#c5a880] text-[#0a241c] shadow' : 'text-white/70 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Mobile Form Body */}
          <div className="p-6 sm:p-8 bg-[#f6f1e8]">
            <AnimatePresence mode="wait">
              {!isSignUp ? (
                <motion.div
                  key="mobile-signin"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleSignInSubmit} className="space-y-5">
                    {signInError && (
                      <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                        {signInError}
                      </div>
                    )}
                    <div className="relative group">
                      <input
                        type="text"
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        placeholder="Username or email"
                        required
                        className="w-full bg-transparent border-b border-[#dcd4c6] pb-2 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758]"
                      />
                      <User className="w-4 h-4 absolute right-0 bottom-2 text-[#9c9589]" />
                    </div>
                    <div className="relative group">
                      <input
                        type={showSignInPassword ? 'text' : 'password'}
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full bg-transparent border-b border-[#dcd4c6] pb-2 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758] pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-0 bottom-2 text-[#9c9589]"
                      >
                        {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 text-[#6b6458]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-[#0e2a22]"
                        />
                        <span>Remember me</span>
                      </label>
                      <Link to="/forgot-password" className="text-[#967846] underline">
                        Forgot password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={signInLoading}
                      className="w-full py-3.5 rounded-full bg-[#0d2e24] text-[#f7f4ee] font-medium text-sm tracking-wide shadow-md"
                    >
                      {signInLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="mobile-signup"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleSignUpSubmit} className="space-y-4">
                    {signUpError && (
                      <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                        {signUpError}
                      </div>
                    )}
                    <div className="relative group">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name"
                        required
                        className="w-full bg-transparent border-b border-[#dcd4c6] pb-2 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758]"
                      />
                      <User className="w-4 h-4 absolute right-0 bottom-2 text-[#9c9589]" />
                    </div>

                    <div>
                      <div className="flex gap-2 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setRegType('email')}
                          className={`text-[10px] uppercase font-semibold ${
                            regType === 'email' ? 'text-[#0e2a22] underline' : 'text-[#9c9589]'
                          }`}
                        >
                          Email
                        </button>
                        <span className="text-xs text-[#c8c0b3]">|</span>
                        <button
                          type="button"
                          onClick={() => setRegType('phone')}
                          className={`text-[10px] uppercase font-semibold ${
                            regType === 'phone' ? 'text-[#0e2a22] underline' : 'text-[#9c9589]'
                          }`}
                        >
                          Mobile
                        </button>
                      </div>
                      <div className="relative group">
                        {regType === 'email' ? (
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            required
                            className="w-full bg-transparent border-b border-[#dcd4c6] pb-2 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758]"
                          />
                        ) : (
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Mobile phone number"
                            required
                            className="w-full bg-transparent border-b border-[#dcd4c6] pb-2 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758]"
                          />
                        )}
                        {regType === 'email' ? (
                          <Mail className="w-4 h-4 absolute right-0 bottom-2 text-[#9c9589]" />
                        ) : (
                          <Phone className="w-4 h-4 absolute right-0 bottom-2 text-[#9c9589]" />
                        )}
                      </div>
                    </div>

                    <div className="relative group">
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Password"
                        required
                        minLength={6}
                        className="w-full bg-transparent border-b border-[#dcd4c6] pb-2 text-[14px] text-[#1a2621] placeholder-[#9c9589] focus:outline-none focus:border-[#b89758] pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-0 bottom-2 text-[#9c9589]"
                      >
                        {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={signUpLoading}
                      className="w-full py-3.5 rounded-full bg-[#0d2e24] text-[#f7f4ee] font-medium text-sm tracking-wide shadow-md"
                    >
                      {signUpLoading ? 'Creating account...' : 'Create account'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AuthCard;
