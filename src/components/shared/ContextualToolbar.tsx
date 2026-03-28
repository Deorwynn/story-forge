import { ReactNode } from 'react';

interface ContextualToolbarProps {
  title: string;
  status?: string;
  children?: ReactNode; // This is where our Toggles or Tabs go
}

export default function ContextualToolbar({
  title,
  status,
  children,
}: ContextualToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100/50">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 font-serif tracking-tight">
          {title}
        </h1>
        {status && (
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 italic">
            {status}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
