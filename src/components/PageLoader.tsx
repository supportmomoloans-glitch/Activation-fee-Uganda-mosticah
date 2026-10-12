import { ReactNode } from 'react';

export default function PageLoader({ children }: { duration?: number; children: ReactNode }) {
  return <>{children}</>;
}
