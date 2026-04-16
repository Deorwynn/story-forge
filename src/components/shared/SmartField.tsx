import { Edit3 } from 'lucide-react';
import React, { useRef, useEffect, memo } from 'react';
import InheritanceIndicator from './InheritanceIndicator';

type SmartFieldType = 'text' | 'textarea' | 'number' | 'custom';

interface SmartFieldProps {
  label: string;
  value: any;
  id: string;
  type?: SmartFieldType;
  variant?: 'inline' | 'stacked';
  placeholder?: string;
  children?: React.ReactNode;
  isEditing: boolean;
  sectionRef: React.RefObject<HTMLDivElement | null>;
  inheritanceSource?: number | 'global' | null;
  isOverridden?: boolean;
  isMasterBook?: boolean;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  onChange?: (value: any) => void;
  onReset?: () => void;
}

const SmartField = memo(
  ({
    label,
    value,
    id,
    type = 'text',
    variant = 'stacked',
    placeholder = 'Not Specified',
    children,
    isEditing,
    onStartEdit,
    onStopEdit,
    onChange,
    onReset,
    sectionRef,
    inheritanceSource = 'global',
    isOverridden,
    isMasterBook = false,
  }: SmartFieldProps) => {
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

    const renderInput = () => {
      if (type === 'custom') return children;

      const commonClasses =
        'w-full bg-white border border-purple-200 rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-purple-400 transition-all';

      switch (type) {
        case 'textarea':
          return (
            <textarea
              autoFocus
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              className={`${commonClasses} min-h-[120px] py-2 resize-none leading-normal`}
            />
          );
        case 'number':
          return (
            <input
              type="number"
              value={value ?? ''}
              onChange={(e) => onChange?.(e.target.value)}
              className={`${commonClasses} h-10 py-2`}
            />
          );
        case 'text':
        default:
          return (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              className={`${commonClasses} h-10 py-2`}
            />
          );
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

        <div
          className={`flex-1 relative w-full min-h-[40px] flex items-center ${type === 'textarea' ? 'pt-2' : ''}`}
        >
          {isEditing ? (
            <div
              className={`w-full h-full flex border-0 border-purple-200 rounded-xl outline-none ${type === 'textarea' ? 'items-start' : 'items-center'}`}
            >
              {renderInput()}
            </div>
          ) : (
            <div
              tabIndex={0}
              onClick={() => onStartEdit(id)}
              role="button"
              aria-labelledby={labelId}
              className={`
                group/field w-full min-h-[40px] py-2 px-4 flex justify-between
                cursor-pointer rounded-xl transition-colors
                outline-none border border-slate-100 hover:bg-slate-50 focus:ring-2 focus:ring-purple-400 focus:bg-purple-50/30
                ${type === 'textarea' ? 'items-start' : 'items-center'}
              `}
            >
              <span
                className={`text-sm font-medium pointer-events-none block ${
                  value ? 'text-slate-900' : 'text-slate-400 italic'
                } ${variant === 'stacked' ? 'whitespace-normal' : 'truncate'}`}
              >
                {value || placeholder}
              </span>

              <div
                className={`flex items-center gap-2 shrink-0 ${type === 'textarea' ? 'mt-0.5' : ''}`}
              >
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

                <InheritanceIndicator
                  inheritanceSource={inheritanceSource}
                  isOverridden={isOverridden}
                  onReset={onReset}
                  isEditing={isEditing}
                  isMasterBook={isMasterBook}
                />
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
