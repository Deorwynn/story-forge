import { Edit3, Link2, Link2Off, RotateCcw } from 'lucide-react';
import React, { useRef, useEffect, memo } from 'react';

interface SmartFieldProps {
  label: string;
  value: string | number | null | undefined;
  id: string;
  variant?: 'inline' | 'stacked';
  placeholder?: string;
  children: React.ReactNode;
  isEditing: boolean;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  sectionRef: React.RefObject<HTMLDivElement | null>;
  inheritanceSource?: number | 'global' | null;
  isOverridden?: boolean;
  onReset?: () => void;
  isMasterBook?: boolean;
}

const SmartField = memo(
  ({
    label,
    value,
    id,
    variant = 'stacked',
    placeholder,
    children,
    isEditing,
    onStartEdit,
    onStopEdit,
    sectionRef,
    inheritanceSource = 'global',
    isOverridden,
    onReset,
    isMasterBook = false,
  }: SmartFieldProps) => {
    const renderInheritanceIcon = () => {
      if (isEditing || isMasterBook) return null;

      return (
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {isOverridden ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset?.();
              }}
              title="Value overridden. Click to revert to inherited value."
              className="
              p-1 rounded-md 
              hover:bg-purple-100 text-purple-600 
              transition-colors group/reset 
              cursor-pointer
              outline-none focus:ring-2 focus:ring-purple-400 focus:bg-purple-50"
            >
              <Link2Off className="w-3.5 h-3.5" />
              <RotateCcw
                aria-hidden="true"
                className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/reset:opacity-100 group-focus:opacity-100 bg-white rounded-full shadow-sm transition-opacity"
              />
            </button>
          ) : inheritanceSource ? (
            <div
              title={`Inherited from ${inheritanceSource === 'global' ? 'Series Bible' : `Book ${inheritanceSource}`}`}
              className="flex items-center gap-0.5 text-slate-300 group-hover:text-purple-400 transition-colors"
            >
              <Link2 aria-hidden="true" className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold">
                {inheritanceSource === 'global' ? 'G' : inheritanceSource}
              </span>
            </div>
          ) : null}
        </div>
      );
    };

    const fieldRef = useRef<HTMLDivElement>(null);
    const labelId = `label-${id}`;

    // Auto-focus logic
    useEffect(() => {
      if (isEditing) {
        const input = fieldRef.current?.querySelector(
          'input, textarea'
        ) as HTMLElement;
        if (input) {
          // Automatically link the child input to our label if it doesn't have one
          if (!input.hasAttribute('aria-labelledby')) {
            input.setAttribute('aria-labelledby', labelId);
          }
          if (document.activeElement !== input) {
            input.focus();
          }
        }
      }
    }, [isEditing, labelId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
        e.preventDefault();
        onStartEdit(id);
      } else if (e.key === 'Enter' && isEditing) {
        // Don't trigger if it's a textarea unless Shift is held
        if ((e.target as HTMLElement).tagName !== 'TEXTAREA') {
          onStopEdit();
          requestAnimationFrame(() => {
            (
              fieldRef.current?.querySelector('[role="button"]') as HTMLElement
            )?.focus();
          });
        }
      }

      // Keyboard Navigation between fields
      if (!isEditing) {
        const fields = Array.from(
          sectionRef.current?.querySelectorAll('[role="button"]') || []
        ) as HTMLElement[];
        const currentBtn = fieldRef.current?.querySelector(
          '[role="button"]'
        ) as HTMLElement;
        const currentIndex = fields.indexOf(currentBtn);

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          fields[currentIndex + 1]?.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          fields[currentIndex - 1]?.focus();
        }
      }
    };

    const containerClasses =
      variant === 'inline'
        ? 'flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-2 md:py-1 group min-h-[44px]'
        : 'flex flex-col space-y-1 min-h-[68px] group';

    const labelClasses =
      variant === 'inline'
        ? 'text-[10px] font-bold text-slate-400 uppercase tracking-tight shrink-0 w-full md:w-28 flex justify-between items-center md:pr-2'
        : 'text-[10px] font-bold text-slate-400 uppercase tracking-tight flex justify-between items-center h-4';

    return (
      <div
        ref={fieldRef}
        className={containerClasses}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          if (
            e.relatedTarget &&
            !e.currentTarget.contains(e.relatedTarget as Node)
          ) {
            onStopEdit();
          }
        }}
      >
        <span id={labelId} className={labelClasses}>
          {label}
          {variant === 'stacked' && !isEditing && (
            <div className="flex items-center gap-2">
              <button
                tabIndex={-1}
                onClick={() => onStartEdit(id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 hover:text-purple-700 cursor-pointer pointer-events-auto"
              >
                <Edit3 aria-hidden="true" className="w-3 h-3" />
              </button>
            </div>
          )}
        </span>

        <div className="flex-1 relative w-full h-10 h-8 flex items-center">
          {isEditing ? (
            <div className="w-full">{children}</div>
          ) : (
            <div
              tabIndex={0}
              onClick={() => onStartEdit(id)}
              role="button"
              aria-labelledby={labelId}
              className="w-full h-full px-4 flex items-center justify-between cursor-pointer rounded-xl border border-white hover:bg-slate-50 outline-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-purple-50/30 group/field"
            >
              <span
                className={`text-sm font-medium pointer-events-none block ${
                  value ? 'text-slate-900' : 'text-slate-400 italic'
                } ${variant === 'stacked' ? 'whitespace-normal' : 'truncate'}`}
              >
                {value || placeholder}
              </span>

              <div className="flex items-center gap-2">
                {/* Edit Icon for Inline Variant */}
                {variant === 'inline' && (
                  <Edit3
                    aria-hidden="true"
                    className="
                    w-3.5 h-3.5 text-purple-400 shrink-0 ml-2 transition-opacity
                    opacity-0 
                    group-hover/field:opacity-100 
                    group-focus/field:opacity-100
                  "
                  />
                )}

                {/* RENDER THE INHERITANCE ICON */}
                {renderInheritanceIcon()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);
SmartField.displayName = 'SmartField';
export default SmartField;
