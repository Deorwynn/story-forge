import { MirrorRound } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useMetadata } from '../../hooks/useMetadata';
import SectionShell from './SectionShell';
import SmartField from '../shared/SmartField';
import SubHeader from '../shared/SubHeader';

export default function AppearanceSection({
  character,
  onUpdate,
  isMasterBook,
}: any) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Callbacks keep the SmartField from re-rendering unnecessarily
  const onStopEdit = useCallback(() => setEditingField(null), []);

  // Initialize metadata fields
  const heightData = useMetadata(character, 'height');
  const physiqueData = useMetadata(character, 'physique');
  const apparentAgeData = useMetadata(character, 'apparent_age');
  const hairData = useMetadata(character, 'hair');
  const eyeColorData = useMetadata(character, 'eye_color');
  const scarsData = useMetadata(character, 'scars');
  const tattoosData = useMetadata(character, 'tattoos');
  const distinctiveFeaturesData = useMetadata(
    character,
    'distinctive_features'
  );
  const clothingStyleData = useMetadata(character, 'clothing_style');
  const postureData = useMetadata(character, 'posture_gait');
  const paletteData = useMetadata(character, 'color_palette');

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

    return baseProps;
  };

  return (
    <SectionShell
      title="Appearance"
      icon={<MirrorRound className="w-4 h-4 text-purple-500" />}
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
          <SubHeader title="Physical Base" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2 mt-4">
            {/* Left Column */}
            <div className="flex flex-col space-y-2">
              <SmartField
                label="Height"
                type="text"
                {...getField(heightData)}
                variant="inline"
              />
              <SmartField
                label="Apparent Age"
                type="text"
                {...getField(apparentAgeData)}
                variant="inline"
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col space-y-2">
              <SmartField
                label="Build / Physique"
                type="textarea"
                {...getField(physiqueData)}
                variant="stacked"
              />
            </div>
          </div>
        </section>

        <section>
          <SubHeader title="Head & Face" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2 mt-4">
            {/* Left Column */}
            <div className="flex flex-col space-y-2">
              <SmartField
                label="Hair"
                type="text"
                {...getField(hairData)}
                variant="inline"
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col space-y-2">
              <SmartField
                label="Eye Color"
                type="text"
                {...getField(eyeColorData)}
                variant="inline"
              />
            </div>
          </div>
        </section>

        <section>
          <SubHeader title="Identity Marks" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2 mt-4">
            {/* Left Column */}
            <div className="flex flex-col space-y-2">
              <SmartField
                label="Scars"
                type="textarea"
                {...getField(scarsData)}
                variant="stacked"
              />

              <SmartField
                label="Tattoos"
                type="textarea"
                {...getField(tattoosData)}
                variant="stacked"
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col space-y-2">
              <SmartField
                label="Distinctive Features"
                type="textarea"
                {...getField(distinctiveFeaturesData)}
                variant="stacked"
              />
            </div>
          </div>
        </section>

        <section>
          <SubHeader title="Presentation" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2 mt-4">
            {/* Left Column */}
            <div className="flex flex-col space-y-2">
              <SmartField
                label="Clothing Style"
                type="textarea"
                {...getField(clothingStyleData)}
                variant="stacked"
              />

              <SmartField
                label="Posture & Gait"
                type="textarea"
                {...getField(postureData)}
                variant="stacked"
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col space-y-2">
              <SmartField
                label="Color Palette"
                type="textarea"
                {...getField(paletteData)}
                variant="stacked"
              />
            </div>
          </div>
        </section>
      </div>
    </SectionShell>
  );
}
