import { ReactNode, useState, useEffect } from 'react';

export default function PageLoader({
  children,
  duration = 450,
}: {
  duration?: number;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, Math.max(100, duration - 150));

    const endTimer = setTimeout(() => {
      setLoading(false);
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, [duration]);

  return (
    <>
      {loading && (
        <div
          id="momo-page-splash-loader"
          className={`fixed inset-0 z-[9999] bg-[#004F71] flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-200 pointer-events-none ${
            fading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ backgroundColor: '#004F71' }}
        >
          {/* Splash screen center branding matching MTN MoMo app */}
          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            {/* 3D MoMo Icon Badge */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-2xl shadow-black/50 bg-gradient-to-b from-[#003853] via-[#002f47] to-[#002133] p-3.5 sm:p-4 border border-[#005c84]/50 flex items-center justify-center">
              <img
                src="https://play-lh.googleusercontent.com/SMmBJN1AfFuDEkgWrVBSPedlqK-8E86N9h7Kh-4--FKdDW2bq-cNfn7s3AEcfmKwlCejxaAsFMGtZUiXu2-OBRw"
                alt="MoMo"
                className="w-full h-full object-contain filter drop-shadow-md"
                loading="eager"
              />
            </div>

            {/* Typography from screenshot */}
            <div className="mt-4 sm:mt-5 text-center flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-black text-[#ffcc00] tracking-tight leading-none drop-shadow-sm font-sans">
                MoMo
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#ffcc00] tracking-normal mt-1 opacity-95">
                from MTN
              </span>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
