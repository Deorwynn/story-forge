import Button from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()} // Prevent closing/triggering stuff behind
    >
      <div
        className="bg-white border border-slate-200 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-slate-800 mb-2 italic">
          {title}
        </h3>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            Cancel
          </Button>
          <Button
            // Force the red color if it's a danger variant
            className={`flex-1 ${variant === 'danger' ? '!bg-red-500 hover:!bg-red-600 !border-red-600 shadow-red-100' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
