import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
  isLoading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  className = '',
  isLoading = false,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all h-8 rounded-lg px-3 gap-2 outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:pointer-events-none disabled:opacity-50 shrink-0 cursor-pointer';

  const variants = {
    primary: 'bg-[#9333ea] text-white hover:bg-[#7e22ce]',
    outline:
      'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:border-slate-300',
    ghost: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
  };

  return (
    <button
      {...props}
      disabled={props.disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
