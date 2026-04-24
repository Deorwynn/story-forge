import { Link2, Link2Off, RotateCcw } from 'lucide-react';

interface InheritanceIndicatorProps {
  inheritanceSource?: number | 'global' | null;
  isOverridden?: boolean;
  onReset?: () => void;
  isEditing?: boolean;
  isMasterBook?: boolean;
  className?: string;
}

const InheritanceIndicator = ({
  inheritanceSource,
  isOverridden,
  onReset,
  isEditing = false,
  isMasterBook = false,
  className = '',
}: InheritanceIndicatorProps) => {
  // Don't show anything if we're editing or in a standalone/master book
  if (isEditing || isMasterBook) return null;

  const displaySource = inheritanceSource === 'global' ? 1 : inheritanceSource;
  const sourceLabel = `Volume ${displaySource}`;

  return (
    <div className={`flex items-center shrink-0 min-w-[24px] ${className}`}>
      {isOverridden ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReset?.();
          }}
          aria-label={`Override active. Reset to inherited value from ${sourceLabel}`}
          title={`Value overridden. Click to revert to ${sourceLabel}.`}
          className="
              relative p-1 rounded-md 
              hover:bg-purple-100 text-purple-600 
              transition-colors group/reset-btn 
              cursor-pointer
              outline-none focus:ring-2 focus:ring-purple-400 focus:bg-purple-50
          "
        >
          <Link2Off className="w-3.5 h-3.5" />
          <RotateCcw
            aria-hidden="true"
            className="
              w-2.5 h-2.5 absolute -top-1 -right-1 
              opacity-0 group-hover/reset:opacity-100 
              bg-white rounded-full shadow-sm transition-opacity
            "
          />
        </button>
      ) : inheritanceSource ? (
        <div
          className="flex items-center gap-0.5 text-slate-400 ml-1 cursor-help"
          role="note"
          aria-label={`Inherited from ${sourceLabel}`}
          title={`Inherited from ${sourceLabel}`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span aria-hidden="true" className="text-[9px] font-bold">
            {displaySource}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default InheritanceIndicator;
