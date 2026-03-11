import { useState, useEffect, useRef } from 'react';
import { ThreeDotsIcon } from './Icons';

export interface ActionItem {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  actions: ActionItem[];
  onOpenChange?: (open: boolean) => void;
}

export default function ActionMenu({ actions, onOpenChange }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync internal state with parent callback
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    // Close on Escape key for accessibility
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:opacity-100`}
      >
        <ThreeDotsIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100"
          role="menu"
        >
          {actions.map((action, i) => (
            <div key={action.label} role="none">
              <button
                role="menuitem"
                className={`w-full text-left px-3 py-2 text-[11px] font-medium flex items-center gap-2 cursor-pointer outline-none
                  ${action.variant === 'danger' ? 'text-red-500 hover:bg-red-50 focus:bg-red-50' : 'text-slate-600 hover:bg-slate-50 focus:bg-slate-50'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  setIsOpen(false);
                }}
              >
                <span className="text-xs" aria-hidden="true">
                  {action.icon}
                </span>
                {action.label}
              </button>

              {/* Divider logic */}
              {i < actions.length - 1 && (
                <div
                  className="h-[1px] bg-slate-100 my-1 mx-2"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
