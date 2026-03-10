import { useState, useEffect, useRef } from 'react';
import { ThreeDotsIcon } from './Icons';

export interface ActionItem {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export default function ActionMenu({ actions }: { actions: ActionItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
      >
        <ThreeDotsIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
          {actions.map((action, i) => (
            <div key={action.label}>
              <button
                className={`w-full text-left px-3 py-2 text-[11px] font-medium flex items-center gap-2 cursor-pointer
                  ${action.variant === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  setIsOpen(false);
                }}
              >
                <span className="text-xs">{action.icon}</span>
                {action.label}
              </button>
              {i < actions.length - 1 && action.variant !== 'danger' && (
                <div className="h-[1px] bg-slate-100 my-1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
