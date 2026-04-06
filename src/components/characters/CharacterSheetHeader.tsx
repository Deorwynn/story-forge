import { useState, useEffect, useRef } from 'react';
import { Camera, Users, Plus } from 'lucide-react';

interface HeaderProps {
  metadata: any;
  role: string;
  onSaveNameParts: (
    first: string,
    middle: string,
    last: string,
    derivedFull: string
  ) => void;
}

const AutoInput = ({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  label,
  autoFocus,
  showLabel,
}: {
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder: string;
  label: string;
  autoFocus?: boolean;
  showLabel: boolean;
}) => (
  <div className="flex flex-col min-w-[40px]">
    <span
      className={`text-[9px] uppercase font-bold text-purple-400 ml-1 mb-1 tracking-tighter transition-opacity duration-300 ${showLabel ? 'opacity-100' : 'opacity-0'}`}
    >
      {label}
    </span>
    <div className="relative inline-grid items-center">
      <span className="invisible whitespace-pre text-3xl font-serif font-bold px-1">
        {value || placeholder}
      </span>
      <input
        value={value}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        spellCheck="false"
        onKeyDown={(e) =>
          e.key === 'Enter' && (e.target as HTMLInputElement).blur()
        }
        onChange={(e) => onChange(e.target.value)}
        placeholder={showLabel ? placeholder : ''}
        className="absolute inset-0 w-full bg-transparent text-3xl font-serif font-bold text-slate-800 border-b-2 border-transparent hover:border-slate-100 focus:border-purple-200 outline-none transition-all px-1"
      />
    </div>
  </div>
);

const AddNameButton = ({
  label,
  onClick,
  ariaLabel,
}: {
  label: string;
  onClick: () => void;
  ariaLabel: string;
}) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className="flex items-center gap-1 text-slate-300 hover:text-purple-400 mb-2 px-2 py-1 rounded-md transition-all animate-in fade-in zoom-in-95 outline-none focus-visible:ring-2 focus-visible:ring-purple-200 cursor-pointer"
  >
    <Plus className="w-3 h-3" />
    <span className="text-[10px] font-bold uppercase tracking-widest">
      {label}
    </span>
  </button>
);

export default function CharacterSheetHeader({
  metadata,
  role,
  onSaveNameParts,
}: HeaderProps) {
  const [first, setFirst] = useState(metadata.first_name || '');
  const [middle, setMiddle] = useState(metadata.middle_name || '');
  const [last, setLast] = useState(metadata.last_name || '');

  const [isEditing, setIsEditing] = useState(false);
  const [isAddingMiddle, setIsAddingMiddle] = useState(false);
  const [isAddingLast, setIsAddingLast] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const allowTransitions = useRef(false);
  const prevIdRef = useRef(metadata.id);

  if (prevIdRef.current !== metadata.id) {
    prevIdRef.current = metadata.id;

    // Tell the DOM we are switching characters
    containerRef.current?.setAttribute('data-switching', 'true');

    setFirst(metadata.first_name || '');
    setMiddle(metadata.middle_name || '');
    setLast(metadata.last_name || '');
    setIsEditing(false);
    setIsAddingMiddle(false);
    setIsAddingLast(false);
    setIsClosing(false);

    // Remove the block after the browser has painted the new character
    requestAnimationFrame(() => {
      containerRef.current?.removeAttribute('data-switching');
    });
  }

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      allowTransitions.current = true;
    });
    return () => cancelAnimationFrame(timer);
  }, [metadata.id]);

  // Sync values if metadata changes externally (without resetting UI)
  useEffect(() => {
    setFirst(metadata.first_name || '');
    setMiddle(metadata.middle_name || '');
    setLast(metadata.last_name || '');
  }, [metadata.first_name, metadata.middle_name, metadata.last_name]);

  const handleChange = (f: string, m: string, l: string) => {
    const full = [f, m, l]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ');
    onSaveNameParts(f, m, l, full);
  };

  const handleBlur = () => {
    setIsClosing(true);

    setTimeout(() => {
      if (
        containerRef.current &&
        !containerRef.current.contains(document.activeElement)
      ) {
        setIsEditing(false);
        setIsAddingMiddle(false);
        setIsAddingLast(false);
        setTimeout(() => setIsClosing(false), 500);
      } else {
        setIsClosing(false);
      }
    }, 50);
  };

  const hasMiddle = middle && middle.trim().length > 0;
  const hasLast = last && last.trim().length > 0;

  const isInteractive =
    isEditing || isAddingMiddle || isAddingLast || isClosing;

  const transitionClass = isInteractive
    ? 'transition-all duration-500 ease-in-out group-data-[switching=true]:transition-none'
    : '';

  return (
    <div
      ref={containerRef}
      className="flex flex-col sm:flex-row items-start gap-8 mb-12"
      onFocus={() => {
        setIsEditing(true);
        setIsClosing(false);
      }}
      onBlur={handleBlur}
    >
      {/* PORTRAIT PLACEHOLDER */}
      <div className="relative group">
        <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-sm overflow-hidden flex items-center justify-center transition-all group-hover:border-purple-100">
          <Users className="w-12 h-12 text-slate-300 group-hover:text-purple-300 transition-colors" />

          {/* Overlay for "Upload" */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all cursor-pointer">
            <Camera className="text-white opacity-0 group-hover:opacity-100 w-6 h-6 transition-opacity" />
          </div>
        </div>
      </div>

      {/* NAME & ROLE INFO */}
      <div className="flex-1 w-full">
        <div className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-widest mb-1">
          {role}
        </div>

        <div className="flex flex-wrap items-end gap-x-2 gap-y-4 min-h-[64px]">
          <div className={transitionClass}>
            <AutoInput
              label="First Name"
              value={first}
              placeholder="First Name"
              showLabel={isEditing}
              onChange={(val) => {
                setFirst(val);
                handleChange(val, middle, last);
              }}
            />
          </div>

          <div
            className={`flex items-end overflow-hidden ${transitionClass} ${
              isEditing || hasMiddle || isAddingMiddle
                ? 'max-w-[300px] opacity-100'
                : 'max-w-0 opacity-0'
            }`}
          >
            <div className="flex items-end min-w-max">
              {hasMiddle || isAddingMiddle ? (
                <AutoInput
                  label="Middle Name"
                  value={middle}
                  placeholder="Middle"
                  showLabel={isEditing}
                  autoFocus={isAddingMiddle}
                  onChange={(val) => {
                    setMiddle(val);
                    onSaveNameParts(
                      first,
                      val,
                      last,
                      [first, val, last].filter(Boolean).join(' ')
                    );
                  }}
                />
              ) : (
                <AddNameButton
                  label="Middle"
                  ariaLabel="Add middle name"
                  onClick={() => setIsAddingMiddle(true)}
                />
              )}
            </div>
          </div>

          {/* LAST NAME WRAPPER */}
          <div
            className={`flex items-end overflow-hidden ${transitionClass} ${
              isEditing || hasLast || isAddingLast
                ? 'max-w-[300px] opacity-100'
                : 'max-w-0 opacity-0'
            }`}
          >
            <div className="flex items-end min-w-max">
              {hasLast || isAddingLast ? (
                <AutoInput
                  label="Last Name"
                  value={last}
                  placeholder="Last"
                  showLabel={isEditing}
                  autoFocus={isAddingLast}
                  onChange={(val) => {
                    setLast(val);
                    onSaveNameParts(
                      first,
                      middle,
                      val,
                      [first, middle, val].filter(Boolean).join(' ')
                    );
                  }}
                />
              ) : (
                <AddNameButton
                  label="Last"
                  ariaLabel="Add last name"
                  onClick={() => setIsAddingLast(true)}
                />
              )}
            </div>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-400 italic">
          No description set for this character yet.
        </p>
      </div>
    </div>
  );
}
