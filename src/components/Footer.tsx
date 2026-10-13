import { useRef, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { Phone, Mail, MapPin, Clock, ShieldCheck } from 'lucide-react';
import rawSettings from '../../settings.json';

export default function Footer() {
  const navigate = useNavigate();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<any>(null);

  const handleFooterTap = (e: MouseEvent) => {
    // Only count taps if user didn't click on links/anchors
    if ((e.target as HTMLElement).closest('a')) return;

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

  return (
    <footer
      id="main-footer"
      onClick={handleFooterTap}
      className="bg-[hsl(220,50%,8%)] border-t border-[hsl(220,30%,20%)] py-12 px-4 text-white select-none cursor-pointer"
      title="Tap 3 times to manage Activation & Withdrawal settings"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="text-xl font-bold tracking-tight">
                MOMO <span className="text-[#ffcc00]">Loans</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Fast, secure and affordable business loans for individuals and entrepreneurs across Uganda. Powered by Mobile Money technology.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#ffcc00] font-semibold bg-[#ffcc00]/10 px-3 py-1.5 rounded-lg w-fit border border-[#ffcc00]/20">
              <ShieldCheck className="w-4 h-4" />
              <span>Licensed & Regulated</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-[#ffcc00] text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">About Us</li>
              <li className="hover:text-white transition-colors cursor-pointer">How It Works</li>
              <li className="hover:text-white transition-colors cursor-pointer">Loan Products</li>
              <li className="hover:text-white transition-colors cursor-pointer">Interest Rates & Fees</li>
              <li className="hover:text-white transition-colors cursor-pointer">Frequently Asked Questions</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-[#ffcc00] text-sm uppercase tracking-wider">Legal & Compliance</h4>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">Terms & Conditions</li>
              <li className="hover:text-white transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-white transition-colors cursor-pointer">Data Protection Policy</li>
              <li className="hover:text-white transition-colors cursor-pointer">Complaints Procedure</li>
              <li className="hover:text-white transition-colors cursor-pointer">Responsible Lending Code</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-[#ffcc00] text-sm uppercase tracking-wider">Contact & Support</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2.5 hover:text-white transition-colors">
                <a
                  href={`https://wa.me/${rawSettings.whatsappRaw || '254780571549'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-[#25D366] hover:text-[#20ba59] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span className="font-bold">{rawSettings.whatsappNumber || '+254 780571549'} <span className="text-xs text-gray-400 font-normal">(WhatsApp Only)</span></span>
                </a>
              </li>
              <li className="flex items-center gap-2.5 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-[#ffcc00] shrink-0" />
                <span>support@momoloans.co.ug</span>
              </li>
              <li className="flex items-center gap-2.5 hover:text-white transition-colors">
                <MapPin className="w-4 h-4 text-[#ffcc00] shrink-0" />
                <span>Plot 14, Jinja Road, Kampala, Uganda</span>
              </li>
              <li className="flex items-center gap-2.5 hover:text-white transition-colors">
                <Clock className="w-4 h-4 text-[#ffcc00] shrink-0" />
                <span>Mon - Fri: 8:00 AM - 5:00 PM EAT</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[hsl(220,30%,18%)] pt-6 text-center text-xs text-gray-400 space-y-2">
          <p>MOMO Loans is a registered financial service provider regulated by the Bank of Uganda.</p>
          <p>Minimum Tenure: 30 days · Maximum Tenure: 12 months · Maximum APR: 33% · Representative Example: UGX 1,000,000 for 3 months at 10% monthly interest.</p>
          <p className="text-gray-500 font-medium">© {new Date().getFullYear()} MOMO Business Loans Uganda. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
