import { ReactNode } from 'react';
import BrandLogo from '../shared/BrandLogo';

interface AppHeaderProps {
  children?: ReactNode;
  subtitle: string;
  className?: string;
}

export default function AppHeader({
  children,
  subtitle,
  className = '',
}: AppHeaderProps) {
  return (
    <header
      className={`h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-50 ${className}`}
    >
      <BrandLogo subtitle={subtitle} />
      <div className="flex items-center gap-4">{children}</div>
    </header>
  );
}
