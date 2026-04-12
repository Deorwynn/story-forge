import { Fingerprint } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import SectionShell from './SectionShell';
import SegmentedControl from '../shared/SegmentedControl';
import SmartField from '../shared/SmartField';
import { useWorkspace } from '../../context/WorkspaceContext';

const MORTALITY_OPTIONS = [
  { value: 'mortal', label: 'Mortal' },
  { value: 'ageless', label: 'Ageless' },
  { value: 'immortal', label: 'Immortal' },
];

export default function IdentitySection({ character, onUpdate }: any) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { activeBookId, project } = useWorkspace();

  // Callbacks keep the SmartField from re-rendering unnecessarily
  const onStartEdit = useCallback((id: string) => setEditingField(id), []);
  const onStopEdit = useCallback(() => setEditingField(null), []);

  // Global click-out
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(event.target as Node)
      ) {
        onStopEdit();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onStopEdit]);

  const getEffectiveAge = () => {
    if (!activeBookId || !project?.books) {
      return (
        character.metadata?.age?.global_value || {
          value: null,
          is_unknown: true,
          mortality: 'mortal',
        }
      );
    }

    const books = project.books;
    const currentBookIndex = books.findIndex((b) => b.id === activeBookId);

    // Walk backwards to find the nearest age override
    for (let i = currentBookIndex; i >= 0; i--) {
      const bookId = books[i].id;
      const ageOverride = character.book_overrides?.[bookId]?.metadata?.age;

      // If this book has an age object, use it
      if (ageOverride) {
        return ageOverride;
      }
    }

    // Fallback to Global
    return (
      character.metadata?.age?.global_value || {
        value: null,
        is_unknown: true,
        mortality: 'mortal',
      }
    );
  };

  const effectiveAge = getEffectiveAge();

  // Updated Update Handler
  const handleAgeUpdate = (key: string, value: any) => {
    const updatedAgeValue = {
      ...effectiveAge,
      [key]: value,
    };

    if (key === 'is_unknown' && value === true) {
      updatedAgeValue.value = null;
    }

    // Pass the cleaned object to the parent
    onUpdate('age', updatedAgeValue);
  };

  const getEffectiveValue = (path: string) => {
    if (!activeBookId || !project?.books)
      return character.metadata?.[path] || '';

    // Get the list of books in order
    const books = project.books;
    const currentBookIndex = books.findIndex((b) => b.id === activeBookId);

    // Look at the current book and then walk BACKWARDS through previous books
    // to find the most recent override.
    for (let i = currentBookIndex; i >= 0; i--) {
      const bookId = books[i].id;
      const override = character.book_overrides?.[bookId]?.metadata?.[path];

      if (override !== undefined && override !== null) {
        return override;
      }
    }

    // If no overrides exist in the current or any previous book, fallback to Global Metadata
    const globalMeta = character.metadata?.[path];
    if (globalMeta !== undefined && globalMeta !== null && globalMeta !== '') {
      return globalMeta;
    }

    // Final Fallback to root level
    return character[path] || '';
  };

  const getInheritanceInfo = (path: string) => {
    if (!activeBookId || !project?.books)
      return { inheritanceSource: 'global' as const, isOverridden: false };

    const books = project.books;
    const currentBookIndex = books.findIndex((b) => b.id === activeBookId);

    // 1. Hide icons for the first book
    if (currentBookIndex === 0) {
      return { inheritanceSource: null, isOverridden: false };
    }

    // 2. Check for override in the CURRENT book
    const currentOverride =
      character.book_overrides?.[activeBookId]?.metadata?.[path];
    const hasCurrentOverride = !!currentOverride;

    // 3. Find the source by walking backwards
    let source: number | 'global' = 'global';

    for (let i = currentBookIndex - 1; i >= 0; i--) {
      const prevOverride =
        character.book_overrides?.[books[i].id]?.metadata?.[path];

      if (prevOverride) {
        // For the 'age' object, we want to make sure it's an actual override
        // and not just an empty initialized object (if your state does that)
        if (path === 'age' && prevOverride.value === undefined) continue;

        source = i + 1;
        break;
      }
    }

    return {
      inheritanceSource: source,
      isOverridden: hasCurrentOverride,
    };
  };

  const handleResetField = (path: string) => {
    // onUpdate(path, null) signifies "remove override"
    onUpdate(path, undefined);
  };

  const getFieldVariant = (value: any) => {
    const stringValue = String(value || '');
    // If text is longer than 22 chars, stack it so it doesn't squish the label
    return stringValue.length > 22 ? 'stacked' : 'inline';
  };

  return (
    <SectionShell
      title="Core Identity"
      icon={<Fingerprint className="w-4 h-4 text-purple-500" />}
      defaultOpen={true}
    >
      <div
        ref={sectionRef}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setEditingField(null);
          }
        }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-1"
      >
        {/* EXISTENCE TYPE */}
        <div
          className="space-y-2 col-span-1 lg:col-span-2"
          onMouseDown={() => setEditingField(null)}
        >
          <label
            id="label-existence-type"
            className="text-[10px] font-bold text-slate-400 uppercase tracking-tight"
          >
            Existence Type
          </label>
          <SegmentedControl
            options={MORTALITY_OPTIONS}
            activeValue={effectiveAge.mortality}
            onChange={(val) => handleAgeUpdate('mortality', val)}
            aria-labelledby="label-existence-type"
          />
        </div>

        {/* AGE */}
        <SmartField
          label="Current Age"
          id="age"
          variant="inline"
          placeholder="Unknown Age"
          sectionRef={sectionRef}
          isEditing={editingField === 'age'}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
          value={
            effectiveAge.is_unknown
              ? 'Age Unknown'
              : effectiveAge.value
                ? `${effectiveAge.value} years old`
                : 'No age set'
          }
          {...getInheritanceInfo('age')}
          onReset={() => handleResetField('age')}
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={effectiveAge.value ?? ''}
              disabled={effectiveAge.is_unknown}
              onChange={(e) =>
                handleAgeUpdate('value', parseInt(e.target.value) || null)
              }
              className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors focus-within:ring-2 focus-within:ring-purple-400">
              <input
                type="checkbox"
                aria-label="Mark age as unknown"
                checked={effectiveAge.is_unknown}
                onChange={(e) =>
                  handleAgeUpdate('is_unknown', e.target.checked)
                }
                className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs font-medium text-slate-600">
                Unknown
              </span>
            </label>
          </div>
        </SmartField>

        <SmartField
          label="Occupation / Role"
          id="occupation"
          variant={getFieldVariant(getEffectiveValue('occupation'))}
          placeholder="No occupation listed"
          sectionRef={sectionRef}
          isEditing={editingField === 'occupation'}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
          value={getEffectiveValue('occupation')}
          {...getInheritanceInfo('occupation')}
          onReset={() => handleResetField('occupation')}
        >
          <input
            type="text"
            value={getEffectiveValue('occupation')}
            onChange={(e) => onUpdate('occupation', e.target.value)}
            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </SmartField>

        <SmartField
          label="Race / Species"
          id="race"
          variant={getFieldVariant(getEffectiveValue('race'))}
          placeholder="No race specified"
          sectionRef={sectionRef}
          isEditing={editingField === 'race'}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
          value={getEffectiveValue('race')}
          {...getInheritanceInfo('race')}
          onReset={() => handleResetField('race')}
        >
          <input
            type="text"
            value={getEffectiveValue('race')}
            onChange={(e) => onUpdate('race', e.target.value)}
            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </SmartField>

        <SmartField
          label="Gender / Pronouns"
          id="gender"
          variant={getFieldVariant(getEffectiveValue('gender'))}
          placeholder="Not specified"
          sectionRef={sectionRef}
          isEditing={editingField === 'gender'}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
          value={getEffectiveValue('gender')}
          {...getInheritanceInfo('gender')}
          onReset={() => handleResetField('gender')}
        >
          <input
            type="text"
            value={getEffectiveValue('gender')}
            onChange={(e) => onUpdate('gender', e.target.value)}
            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </SmartField>
      </div>
    </SectionShell>
  );
}
