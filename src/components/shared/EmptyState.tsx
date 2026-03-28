import React from 'react';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center mt-20 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full max-w-xl text-center py-16 px-8 border border-slate-200 rounded-[2.5rem] bg-white shadow-xl shadow-purple-500/5">
        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
          {icon ? (
            <div className="text-purple-600" aria-hidden="true">
              {icon}
            </div>
          ) : (
            <span className="text-2xl" aria-hidden="true">
              ✨
            </span>
          )}
        </div>

        <p className="text-slate-800 mb-2 font-bold text-xl">{title}</p>

        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
          {description}
        </p>

        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="shadow-purple-200 shadow-lg px-6"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
