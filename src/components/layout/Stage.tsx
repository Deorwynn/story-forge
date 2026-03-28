import { ReactNode } from 'react';

interface StageProps {
  children: ReactNode;
  variant?: 'focused' | 'wide' | 'full';
}

export default function Stage({ children, variant = 'focused' }: StageProps) {
  // Define max-widths based on the variant of content
  const maxWidthClass =
    variant === 'focused'
      ? 'max-w-3xl'
      : variant === 'wide'
        ? 'max-w-5xl'
        : 'max-w-full';

  return (
    <main className="flex-1 h-full overflow-y-auto custom-scrollbar bg-white">
      <div className={`mx-auto px-8 py-6 ${maxWidthClass} min-h-full`}>
        {children}
      </div>
    </main>
  );
}
