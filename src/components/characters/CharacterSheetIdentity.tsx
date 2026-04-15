import { Fingerprint } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import SectionShell from './SectionShell';
import SegmentedControl from '../shared/SegmentedControl';
import SmartField from '../shared/SmartField';
import InheritanceIndicator from '../shared/InheritanceIndicator';
import { useWorkspace } from '../../context/WorkspaceContext';

const MORTALITY_OPTIONS = [
  { value: 'mortal', label: 'Mortal' },
  { value: 'ageless', label: 'Ageless' },
  { value: 'immortal', label: 'Immortal' },
];

export default function IdentitySection({
  character,
  onUpdate,
  isMasterBook,
}: any) {
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
    const getVal = (path: string, defaultVal: any) => {
      if (!activeBookId || !project?.books) {
        return character.metadata?.[path]?.global_value ?? defaultVal;
      }

      const books = project.books;
      const currentBookIndex = books.findIndex((b) => b.id === activeBookId);

      // Walk backwards for the specific sub-field (e.g., 'age_value')
      for (let i = currentBookIndex; i >= 0; i--) {
        const bookId = books[i].id;
        const override = character.book_overrides?.[bookId]?.metadata?.[path];

        // allow null, only skip if undefined
        if (override !== undefined) return override;
      }

      return character.metadata?.[path]?.global_value ?? defaultVal;
    };

    return {
      value: getVal('age_value', null),
      is_unknown: getVal('age_is_unknown', true),
      mortality: getVal('mortality', 'mortal'),
    };
  };

  const effectiveAge = getEffectiveAge();

  const getEffectiveMortality = () => {
    return getEffectiveValue('mortality') || 'mortal';
  };

  const handleAgeUpdate = (key: string, value: any) => {
    if (key === 'mortality') {
      // Send mortality as its own field update
      onUpdate('mortality', value);
    } else {
      // Send age_value or age_is_unknown as the 'age' group
      const updatedAge = {
        ...effectiveAge,
        [key]: value,
      };
      if (key === 'is_unknown' && value === true) {
        updatedAge.value = null;
      }
      onUpdate('age', updatedAge);
    }
  };

  const getEffectiveValue = (path: string) => {
    const bookExists = project?.books?.some((b) => b.id === activeBookId);

    if (!activeBookId || !project?.books || !bookExists) {
      const meta = character.metadata?.[path];
      return meta?.global_value !== undefined ? meta.global_value : meta || '';
    }

    const books = project.books;
    const currentBookIndex = books.findIndex((b) => b.id === activeBookId);

    for (let i = currentBookIndex; i >= 0; i--) {
      const bookId = books[i].id;
      const override = character.book_overrides?.[bookId]?.metadata?.[path];
      if (override !== undefined && override !== null) return override;
    }

    const globalMeta = character.metadata?.[path];
    // Check if it's a TemporalField structure
    if (globalMeta?.global_value !== undefined) return globalMeta.global_value;

    return globalMeta || '';
  };

  const getInheritanceInfo = (path: string) => {
    if (!activeBookId || !project?.books)
      return { inheritanceSource: 'global' as const, isOverridden: false };

    const books = project.books;
    const currentBookIndex = books.findIndex((b) => b.id === activeBookId);
    if (currentBookIndex === 0)
      return { inheritanceSource: null, isOverridden: false };

    // Helper to check if a "logical" field is overridden in a specific book
    const checkOverride = (bookId: string, fieldPath: string) => {
      const meta = character.book_overrides?.[bookId]?.metadata;
      if (!meta) return false;

      if (fieldPath === 'age') {
        // Age only unlinks if the specific numeric value or unknown status changes
        return (
          meta.age_value !== undefined || meta.age_is_unknown !== undefined
        );
      }

      if (fieldPath === 'mortality') {
        // Mortality only unlinks if existence type changes
        return meta.mortality !== undefined;
      }

      return meta[fieldPath] !== undefined;
    };

    const hasCurrentOverride = checkOverride(activeBookId, path);

    // Find the source by walking backwards
    let source: number | 'global' = 'global';
    for (let i = currentBookIndex - 1; i >= 0; i--) {
      if (checkOverride(books[i].id, path)) {
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
    // whatever path it is (age, mortality, race), tell the parent to delete it
    onUpdate(path, undefined);
  };

  const getFieldVariant = (value: any) => {
    const stringValue = String(value || '');
    // If text is longer than 22 chars, stack it so it doesn't squish the label
    return stringValue.length > 22 ? 'stacked' : 'inline';
  };

  const mortalityInheritance = getInheritanceInfo('mortality');

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

          <div className="flex items-center justify-start gap-3">
            <div className="w-full max-w-[200px]">
              <SegmentedControl
                options={MORTALITY_OPTIONS}
                activeValue={getEffectiveMortality()}
                onChange={(val) => handleAgeUpdate('mortality', val)}
                aria-labelledby="label-existence-type"
              />
            </div>

            <InheritanceIndicator
              {...mortalityInheritance}
              onReset={() => handleResetField('mortality')}
              isMasterBook={isMasterBook}
            />
          </div>
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
          isMasterBook={isMasterBook}
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
          isMasterBook={isMasterBook}
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
          isMasterBook={isMasterBook}
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
          isMasterBook={isMasterBook}
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
