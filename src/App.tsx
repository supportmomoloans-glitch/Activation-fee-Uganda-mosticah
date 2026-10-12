import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignUpFlow from './pages/SignUpFlow';
import SignInPage from './pages/SignInPage';
import LoanApplication from './pages/LoanApplication';
import PersonalDetails from './pages/PersonalDetails';
import PaymentPage from './pages/PaymentPage';
import SuccessPage from './pages/SuccessPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUpFlow />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/apply" element={<LoanApplication />} />
        <Route path="/personal-details" element={<PersonalDetails />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/withdraw" element={<PaymentPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
