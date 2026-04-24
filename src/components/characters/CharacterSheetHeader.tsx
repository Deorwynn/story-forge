import { useState, useEffect, useRef } from 'react';
import { PortraitFrame } from '../../types/character';
import { Plus } from 'lucide-react';
import { ImageUpload } from '../shared/ImageUpload';
import PortraitFramerModal from './PortraitFramerModal';

interface HeaderProps {
  metadata: any;
  role: string;
  onSaveNameParts: (
    first: string,
    middle: string,
    last: string,
    derivedFull: string
  ) => void;
  onUpdatePortrait: (newPath: string) => void;
  onUpdateFraming: (frame: PortraitFrame) => void;
  portraitUrl: string | null;
  effectiveFrame: PortraitFrame | null;
  displayPath: string | null;
  currentBookId?: string | null;
  portraitVersion: number;
  isMasterBook: boolean;
  portraitInheritance?: {
    isOverridden: boolean;
    inheritanceSource: number | 'global' | null;
  };
  onResetPortrait?: () => void;
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
  onUpdatePortrait,
  onUpdateFraming,
  portraitVersion,
  portraitUrl,
  effectiveFrame,
  displayPath,
  isMasterBook,
  portraitInheritance,
  onResetPortrait,
}: HeaderProps) {
  const [first, setFirst] = useState(metadata.first_name || '');
  const [middle, setMiddle] = useState(metadata.middle_name || '');
  const [last, setLast] = useState(metadata.last_name || '');

  const [isEditing, setIsEditing] = useState(false);
  const [isAddingMiddle, setIsAddingMiddle] = useState(false);
  const [isAddingLast, setIsAddingLast] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isFramerOpen, setIsFramerOpen] = useState(false);

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
      className="flex flex-col sm:flex-row gap-1 sm:gap-8 mb-5"
    >
      {/* LEFT COLUMN: PORTRAIT + ROLE */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div className="relative w-44">
          <ImageUpload
            variant="portrait"
            collection="characters"
            entityId={metadata.id}
            currentPath={displayPath}
            version={portraitVersion}
            framing={effectiveFrame}
            onUploadSuccess={(newPath) => {
              onUpdatePortrait(newPath);
            }}
            onReposition={() => setIsFramerOpen(true)}
            isMasterBook={isMasterBook}
            isOverridden={portraitInheritance?.isOverridden}
            inheritanceSource={portraitInheritance?.inheritanceSource}
            onReset={onResetPortrait}
          />
        </div>

        {/* ROLE PILL */}
        <div className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-widest">
          {role}
        </div>
      </div>

      {/* RIGHT COLUMN: NAME & DESCRIPTION */}
      <div className="flex-1 w-full">
        <div
          className="flex flex-wrap items-end gap-x-2 gap-y-4 min-h-[64px]"
          onFocus={() => {
            if (isFramerOpen) return;
            setIsEditing(true);
            setIsClosing(false);
          }}
          onBlur={handleBlur}
        >
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

        {isFramerOpen && portraitUrl && (
          <PortraitFramerModal
            imageSrc={portraitUrl}
            initialFrame={effectiveFrame}
            onClose={() => {
              setIsFramerOpen(false);
              setIsEditing(false);
            }}
            onSave={(finalFrame) => {
              onUpdateFraming(finalFrame);
              setIsFramerOpen(false);
              setIsEditing(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
