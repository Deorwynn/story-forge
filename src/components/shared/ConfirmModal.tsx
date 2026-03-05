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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className={`flex-1 ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600 border-red-600' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
