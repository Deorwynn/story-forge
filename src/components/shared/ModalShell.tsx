import { ReactNode } from 'react';

interface ModalShellProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  maxWidth?: string;
}

export default function ModalShell({
  children,
  onClose,
  title,
  maxWidth = 'max-w-lg',
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`relative bg-white border border-slate-200 p-10 rounded-[2.5rem] w-full ${maxWidth} shadow-2xl text-slate-800 z-10 animate-in zoom-in-95 duration-300`}
      >
        {title && <h2 className="text-3xl font-bold mb-8 italic">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
