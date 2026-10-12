export default function Logo({ size = 'lg', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dims = size === 'lg' ? 'w-20 h-20 md:w-24 md:h-24' : size === 'md' ? 'w-14 h-14 md:w-16 md:h-16' : 'w-10 h-10';
  return (
    <img
      id="momo-brand-logo"
      src="https://play-lh.googleusercontent.com/SMmBJN1AfFuDEkgWrVBSPedlqK-8E86N9h7Kh-4--FKdDW2bq-cNfn7s3AEcfmKwlCejxaAsFMGtZUiXu2-OBRw"
      alt="MOMO Loans"
      className={`${dims} rounded-2xl object-contain shadow-md ${className}`}
      loading="eager"
      referrerPolicy="no-referrer"
    />
  );
}
