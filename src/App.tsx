import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignUpFlow from './pages/SignUpFlow';
import SignInPage from './pages/SignInPage';
import LoanApplication from './pages/LoanApplication';
import PersonalDetails from './pages/PersonalDetails';
import PaymentPage from './pages/PaymentPage';
import SuccessPage from './pages/SuccessPage';
import WithdrawalProgressPage from './pages/WithdrawalProgressPage';

import { parseUrlSettings, saveSettingsToLocal, getResolvedSettings } from './lib/settings';

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // If URL has embedded settings (?cfg=...), immediately resolve and persist
    const urlOverrides = parseUrlSettings();
    if (urlOverrides) {
      const updated = { ...getResolvedSettings(), ...urlOverrides };
      saveSettingsToLocal(updated);
    }
  }, [location]);

  return null;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <Routes location={location}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignUpFlow />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/apply" element={<LoanApplication />} />
      <Route path="/personal-details" element={<PersonalDetails />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/withdraw" element={<PaymentPage />} />
      <Route path="/withdrawal-status" element={<WithdrawalProgressPage />} />
      <Route path="/progress" element={<WithdrawalProgressPage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
    </BrowserRouter>
  );
}
