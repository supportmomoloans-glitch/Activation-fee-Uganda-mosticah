import { useState, useEffect, ReactNode } from 'react';
import Logo from './Logo';
import { Loader2 } from 'lucide-react';

export default function PageLoader({ duration = 700, children }: { duration?: number; children: ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (loading) {
    return (
      <div id="page-loader" className="min-h-screen bg-[hsl(220,50%,12%)] flex flex-col items-center justify-center gap-6 text-white p-4">
        <Logo size="md" />
        <h2 className="text-xl font-bold tracking-tight">
          MoMo <span className="text-[#ffcc00]">Business Loans</span>
        </h2>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <Loader2 className="w-6 h-6 text-[#ffcc00] animate-spin" />
          <span>Loading secure portal...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
