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
  const { activeBookId } = useWorkspace();

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
    // Start with global as the base
    const baseAge = character.metadata?.age?.global_value || {
      value: null,
      is_unknown: true,
      mortality: 'mortal',
    };

    // If we are in a book and an override exists for age, use that instead
    if (
      activeBookId &&
      character.book_overrides?.[activeBookId]?.metadata?.age
    ) {
      return character.book_overrides[activeBookId].metadata.age;
    }

    return baseAge;
  };

  const effectiveAge = getEffectiveAge();

  // 2. Updated Update Handler
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
    if (activeBookId && character.book_overrides?.[activeBookId]) {
      const override = character.book_overrides[activeBookId];

      if (
        override.metadata?.[path] !== undefined &&
        override.metadata?.[path] !== ''
      ) {
        return override.metadata[path];
      }
    }
    if (
      character.metadata?.[path] !== undefined &&
      character.metadata?.[path] !== ''
    ) {
      return character.metadata[path];
    }

    // Root level
    return character[path] || '';
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
        className="grid grid-cols-1 md:grid-cols-2 gap-x-18 gap-y-3"
      >
        {/* EXISTENCE TYPE */}
        <div
          className="space-y-2 col-span-1 md:col-span-2"
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
          variant="inline"
          placeholder="No occupation listed"
          sectionRef={sectionRef}
          isEditing={editingField === 'occupation'}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
          value={getEffectiveValue('occupation')}
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
          variant="inline"
          placeholder="No race specified"
          sectionRef={sectionRef}
          isEditing={editingField === 'race'}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
          value={getEffectiveValue('race')}
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
          variant="inline"
          placeholder="Not specified"
          sectionRef={sectionRef}
          isEditing={editingField === 'gender'}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
          value={getEffectiveValue('gender')}
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
