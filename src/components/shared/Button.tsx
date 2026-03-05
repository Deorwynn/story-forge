import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  isLoading,
  fullWidth,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'relative font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[#9333ea] text-white py-4 px-8 shadow-xl shadow-purple-100 hover:bg-[#7e22ce] hover:-translate-y-1 active:scale-95',
    secondary:
      'bg-slate-50 border border-slate-200 text-slate-600 py-4 px-8 hover:bg-slate-100',
    ghost: 'text-slate-400 py-4 px-4 hover:text-slate-600',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Glossy overlay for Primary variant */}
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
      )}

      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}
