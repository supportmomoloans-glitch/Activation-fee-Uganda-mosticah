import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import PageLoader from '../components/PageLoader';
import { getSession, getApplication, clearSession, clearApplication, MoMoSession, LoanApplication } from '../lib/session';
import {
  Sparkles,
  ArrowRight,
  LogOut,
  FileText,
  Clock,
  Smartphone,
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
    <div className="min-h-screen bg-[hsl(220,50%,12%)] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#ffcc00] text-[hsl(220,50%,12%)] py-3 px-4 shadow-md sticky top-0 z-40">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight">
              MoMo <span className="font-normal opacity-90">Business Loans</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold bg-[hsl(220,50%,12%)]/10 px-2.5 py-1 rounded-full">
              {session.countryCode} {session.phone}
            </span>
            <button
              id="logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-[hsl(220,50%,12%)] text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-[hsl(220,50%,12%)]/90 transition shadow-sm"
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
        <div className="bg-gradient-to-r from-[hsl(220,50%,16%)] to-[hsl(220,40%,20%)] rounded-3xl p-6 sm:p-8 mb-8 border border-[hsl(220,30%,25%)] shadow-xl relative overflow-hidden">
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
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#ffcc00] text-[hsl(220,50%,12%)] font-extrabold text-sm sm:text-base hover:bg-[#ffcc00]/90 transition shadow-lg flex items-center justify-center gap-2 group shrink-0"
            >
              <span>Apply for Loan</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Existing Application Card */}
        {application ? (
          <div id="application-status-card" className="bg-[hsl(220,50%,16%)] rounded-3xl p-6 sm:p-8 mb-8 border border-[hsl(220,30%,25%)] shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[hsl(220,30%,25%)]">
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
              <div className="bg-[hsl(220,50%,12%)] rounded-2xl p-4 border border-[hsl(220,30%,20%)]">
                <p className="text-xs text-gray-400 font-medium mb-1">Approved Amount</p>
                <p className="font-extrabold text-base sm:text-lg text-[#ffcc00]">{application.amount}</p>
              </div>
              <div className="bg-[hsl(220,50%,12%)] rounded-2xl p-4 border border-[hsl(220,30%,20%)]">
                <p className="text-xs text-gray-400 font-medium mb-1">Repayment Period</p>
                <p className="font-bold text-sm sm:text-base text-white">{application.repayment}</p>
              </div>
              <div className="bg-[hsl(220,50%,12%)] rounded-2xl p-4 border border-[hsl(220,30%,20%)]">
                <p className="text-xs text-gray-400 font-medium mb-1">Loan Purpose</p>
                <p className="font-bold text-sm sm:text-base text-white truncate">{application.purpose}</p>
              </div>
              <div className="bg-[hsl(220,50%,12%)] rounded-2xl p-4 border border-[hsl(220,30%,20%)]">
                <p className="text-xs text-gray-400 font-medium mb-1">Applicant Name</p>
                <p className="font-bold text-sm sm:text-base text-white truncate">{application.firstName} {application.lastName}</p>
              </div>
            </div>

            <div className="bg-[hsl(220,50%,12%)] rounded-2xl p-4 border border-[hsl(220,30%,20%)] flex items-center justify-between flex-wrap gap-3">
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
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState<MoMoSession | null>(null);
  const [application, setAppState] = useState<LoanApplication | null>(null);

  useEffect(() => {
    setSessionState(getSession());
    setAppState(getApplication());
  }, []);

  const handleLogout = () => {
    clearSession();
    clearApplication();
    setSessionState(null);
    setAppState(null);
  };

  if (session?.loggedIn) {
    return (
      <PageLoader>
        <LoggedInHome session={session} application={application} onLogout={handleLogout} />
      </PageLoader>
    );
  }

  return (
    <PageLoader>
      <div className="min-h-screen bg-[hsl(220,50%,12%)] text-white flex flex-col justify-between">
        <div>
          {/* Hero Section without top header */}
          <section className="container mx-auto max-w-6xl px-4 py-16 sm:py-24 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(220,50%,18%)] border border-[hsl(220,30%,28%)] text-xs sm:text-sm font-bold text-[#ffcc00] mb-6 shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span>Fast & Affordable Mobile Money Financing in Uganda</span>
            </div>

            <Logo size="lg" className="mb-6 shadow-2xl" />

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight sm:leading-tight mb-6">
              Empower Your Business with Instant <span className="text-[#ffcc00]">MoMo Loans</span>
            </h1>

            <p className="text-gray-300 text-base sm:text-lg md:text-xl max-w-2xl mb-8 leading-relaxed font-medium">
              Get quick funding directly to your Mobile Money wallet in Uganda. Fast disbursements, transparent terms, and zero collateral required.
            </p>

            {/* Action Button: Apply for Loan */}
            <div className="flex flex-col items-center justify-center gap-4 w-full sm:w-auto">
              <button
                id="hero-apply-btn"
                onClick={() => navigate('/apply')}
                className="w-full sm:w-auto px-10 py-4 rounded-full bg-[#ffcc00] text-[hsl(220,50%,12%)] font-extrabold text-base sm:text-lg hover:bg-[#ffcc00]/90 transition shadow-2xl flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Apply for Loan</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                id="link-signin-btn"
                onClick={() => navigate('/signin')}
                className="text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition mt-1 underline underline-offset-4"
              >
                Already registered? Sign In
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </PageLoader>
  );
}
