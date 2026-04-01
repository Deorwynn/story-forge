import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import CharacterSheetHeader from './CharacterSheetHeader';
import CharacterSheetIdentity from './CharacterSheetIdentity';

export default function CharacterSheetView({
  characterId,
}: {
  characterId: string;
}) {
  const [character, setCharacter] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localData, setLocalData] = useState<any>(null);

  // 1. Fetch character data on mount or ID change
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // Set to null first to trigger the "Loading grimoire..." state
      // This prevents seeing the OLD character's data while the new one loads
      setLocalData(null);

      try {
        const data = await invoke('get_character', { id: characterId });
        if (isMounted) {
          setCharacter(data);
          setLocalData(data);
        }
      } catch (err) {
        console.error('Load failed:', err);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [characterId]);

  // 2. The Save Function
  const saveToBackend = useCallback(
    async (dataToSave: any) => {
      if (!dataToSave) return;
      setIsSaving(true);
      try {
        await invoke('update_character', {
          id: characterId,
          updates: dataToSave,
        });
      } catch (err) {
        console.error('Save failed:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [characterId]
  );

  // 3. The Debounce Logic + The "Safety Net" Cleanup
  useEffect(() => {
    if (!localData || localData === character) return;

    const timer = setTimeout(() => {
      saveToBackend(localData);
      setCharacter(localData); // Sync master state
    }, 1000);

    // CLEANUP: This runs if the user switches tabs or closes the sheet
    return () => {
      clearTimeout(timer);
      if (localData !== character) {
        // "Flush" the save immediately before the component unmounts
        saveToBackend(localData);
      }
    };
  }, [localData, character, saveToBackend]);

  const handleUpdate = (field: string, value: any) => {
    setLocalData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Helper for metadata updates (nested objects)
  const handleMetadataUpdate = (key: string, value: any) => {
    setLocalData((prev: any) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  if (!localData)
    return <div className="p-10 text-slate-400">Loading grimoire...</div>;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* Saving Indicator */}
      <div className="h-6 mb-4 flex justify-end">
        {isSaving && (
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest animate-pulse">
            Saving to library...
          </span>
        )}
      </div>

      <CharacterSheetHeader
        displayName={localData.display_name}
        role={localData.role}
        onSaveName={(name) => handleUpdate('display_name', name)}
      />

      <CharacterSheetIdentity
        character={localData}
        onUpdate={handleMetadataUpdate}
      />

      {/* Next sections go here: Physical, Backstory, etc. */}
    </div>
  );
}
