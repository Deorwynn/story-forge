import { Fingerprint } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useMetadata } from '../../hooks/useMetadata';
import SectionShell from './SectionShell';
import SegmentedControl from '../shared/SegmentedControl';
import SmartField from '../shared/SmartField';
import InheritanceIndicator from '../shared/InheritanceIndicator';
import SubHeader from '../shared/SubHeader';

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
  const [localAge, setLocalAge] = useState<number | string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Callbacks keep the SmartField from re-rendering unnecessarily
  const onStopEdit = useCallback(() => setEditingField(null), []);

  // Initialize metadata fields
  const mortalityData = useMetadata(character, 'mortality');
  const ageValueData = useMetadata(character, 'age_value');
  const ageUnknownData = useMetadata(character, 'age_is_unknown');
  const occupationData = useMetadata(character, 'occupation');
  const raceData = useMetadata(character, 'race');
  const genderData = useMetadata(character, 'gender');
  const perceptionData = useMetadata(character, 'perception');

  // Sync local buffer for Age (only when NOT typing)
  useEffect(() => {
    // Only sync if we aren't currently editing this specific field
    // AND the value coming from the hook is actually different from our local state
    if (editingField !== 'age_value' && ageValueData.value !== localAge) {
      setLocalAge(ageValueData.value ?? '');
    }
  }, [ageValueData.value, editingField]);

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

  const handleAgeUpdate = (key: string, value: any) => {
    const backendKey = key === 'value' ? 'age_value' : 'age_is_unknown';
    onUpdate(backendKey, value);

    if (backendKey === 'age_is_unknown' && value === true) {
      onUpdate('age_value', null);
      setLocalAge('');
    }
  };

  // Props spreader helper
  const getField = (hookData: any) => {
    const baseProps = {
      ...hookData.smartProps,
      isEditing: editingField === hookData.smartProps.id,
      onStartEdit: (id: string) => setEditingField(id),
      onStopEdit: () => setEditingField(null),
      onChange: (val: any) => onUpdate(hookData.smartProps.id, val),
      onReset: () => onUpdate(hookData.smartProps.id, undefined), // Default reset
      sectionRef,
      isMasterBook,
    };

    // SPECIAL CASE: If this is the age field, reset the 'unknown' toggle too
    if (hookData.smartProps.id === 'age_value') {
      baseProps.onReset = () => {
        onUpdate('age_value', undefined);
        onUpdate('age_is_unknown', undefined);
      };
    }

    return baseProps;
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
        className="space-y-8"
      >
        <section>
          <SubHeader title="Basic Information" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2 mt-4">
            {/* Left Column */}
            <div className="flex flex-col space-y-2">
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
                      activeValue={mortalityData.value || 'mortal'}
                      onChange={(val) => onUpdate('mortality', val)}
                      aria-labelledby="label-existence-type"
                    />
                  </div>

                  <InheritanceIndicator
                    {...mortalityData.smartProps}
                    onReset={() => onUpdate('mortality', undefined)}
                    isMasterBook={isMasterBook}
                  />
                </div>
              </div>

              <SmartField
                label="Current Age"
                type="custom"
                {...getField(ageValueData)}
                variant="inline"
                value={
                  ageUnknownData.value === true // Explicit check
                    ? 'Age Unknown'
                    : typeof ageValueData.value === 'number'
                      ? `${ageValueData.value} years old`
                      : 'Not Specified'
                }
              >
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={localAge ?? ''}
                    disabled={ageUnknownData.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalAge(val);
                      const numericVal = val === '' ? null : parseInt(val, 10);
                      handleAgeUpdate('value', numericVal);
                    }}
                    className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors focus-within:ring-2 focus-within:ring-purple-400">
                    <input
                      type="checkbox"
                      aria-label="Mark age as unknown"
                      checked={!!ageUnknownData.value}
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
                label="Race / Species"
                type="text"
                {...getField(raceData)}
                variant="inline"
              />

              <SmartField
                label="Perception"
                type="textarea"
                {...getField(perceptionData)}
                variant="stacked"
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col space-y-2">
              <SmartField
                label="Occupation / Role"
                type="text"
                {...getField(occupationData)}
                variant="inline"
              />

              <SmartField
                label="Gender / Pronouns"
                type="text"
                {...getField(genderData)}
                variant="inline"
              />
            </div>
          </div>
        </section>
      </div>
    </SectionShell>
  );
}
