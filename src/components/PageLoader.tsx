import { ReactNode, useState, useEffect } from 'react';

export default function PageLoader({
  children,
  duration = 3000,
}: {
  duration?: number;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fading out slightly before unmounting for smooth transition
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, Math.max(100, duration - 300));

    // Complete loading at exactly duration (3 seconds default)
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
          className={`fixed inset-0 z-[9999] bg-[#004F71] flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-300 ${
            fading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
          }`}
          style={{ backgroundColor: '#004F71' }}
        >
          {/* Splash screen center branding matching MTN MoMo app */}
          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            {/* 3D MoMo Icon Badge */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-2xl shadow-black/50 bg-gradient-to-b from-[#003853] via-[#002f47] to-[#002133] p-3.5 sm:p-4 border border-[#005c84]/50 flex items-center justify-center animate-pulse">
              <img
                src="https://play-lh.googleusercontent.com/SMmBJN1AfFuDEkgWrVBSPedlqK-8E86N9h7Kh-4--FKdDW2bq-cNfn7s3AEcfmKwlCejxaAsFMGtZUiXu2-OBRw"
                alt="MoMo"
                className="w-full h-full object-contain filter drop-shadow-md"
                loading="eager"
              />
            </div>

            {/* Typography */}
            <div className="mt-4 sm:mt-5 text-center flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-black text-[#ffcc00] tracking-tight leading-none drop-shadow-sm font-sans">
                MoMo
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#ffcc00] tracking-normal mt-1 opacity-95">
                from MTN
              </span>
            </div>

            {/* 3-second animated progress bar */}
            <div className="mt-8 w-44 sm:w-52 h-1.5 bg-[#00344d] rounded-full overflow-hidden border border-[#00608a]/40 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#ffcc00] via-[#ffd633] to-[#ffcc00] rounded-full animate-loader-progress shadow-sm"
              />
            </div>
            <span className="text-[11px] font-semibold text-[#ffcc00]/80 mt-2.5 tracking-wide">
              Loading...
            </span>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
