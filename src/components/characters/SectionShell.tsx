import { ReactNode, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionShellProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'danger';
}

export default function SectionShell({
  title,
  icon,
  children,
  defaultOpen = true,
  variant = 'default',
}: SectionShellProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isReady, setIsReady] = useState(false);

  // Set isReady to true AFTER the first render
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const themes = {
    default: {
      border: 'border-slate-100',
      bg: 'bg-slate-50/30',
      iconBg: 'bg-purple-50',
      textColor: 'text-slate-700',
      chevron: 'text-slate-400',
      hover: 'hover:bg-slate-50',
    },
    danger: {
      border: 'border-red-100',
      bg: 'bg-red-50/10',
      iconBg: 'bg-red-50',
      textColor: 'text-red-600',
      chevron: 'text-red-300',
      hover: 'hover:bg-red-50/30',
    },
  };

  const theme = themes[variant];

  return (
    <div
      className={`border ${theme.border} rounded-3xl overflow-hidden mb-6 ${theme.bg}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`
          cursor-pointer w-full flex items-center justify-between p-5 bg-white ${theme.hover} transition-colors z-10 relative
          outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-inset
          `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 ${theme.iconBg} rounded-lg`} aria-hidden="true">
            {icon}
          </div>
          <span
            className={`text-xs font-bold uppercase tracking-widest ${theme.textColor}`}
          >
            {title}
          </span>
        </div>
        <div
          className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        >
          <ChevronDown
            className={`w-4 h-4 ${theme.chevron}`}
            aria-hidden="true"
          />
        </div>
      </button>

      <div
        className={`
        grid transition-all duration-300 ease-in-out
        ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
        ${!isReady ? '!transition-none' : ''} 
      `}
        role="region"
        aria-label={title}
      >
        <div className="overflow-hidden">
          <div className="p-6 pt-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
