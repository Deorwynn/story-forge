import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useWorkspace } from '../../context/WorkspaceContext';
import CharacterSheetHeader from './CharacterSheetHeader';
import CharacterSheetIdentity from './CharacterSheetIdentity';
import { Character } from '../../types/character';

export default function CharacterSheetView({
  characterId,
}: {
  characterId: string;
}) {
  const { updateCharacter } = useWorkspace();
  const [character, setCharacter] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localData, setLocalData] = useState<any>(null);
  const [lastSavedData, setLastSavedData] = useState<string>('');
  const dataRef = useRef(localData);
  const masterRef = useRef(character);

  // 1. Fetch character data on mount or ID change
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // Set to null first to trigger the "Loading grimoire..." state
      // This prevents seeing the OLD character's data while the new one loads
      setLocalData(null);

      try {
        const data = await invoke<Character>('get_character', {
          id: characterId,
        });
        if (isMounted) {
          setCharacter(data);
          setLocalData({ ...data });
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
      if (!dataToSave || !dataToSave.id) return;
      setIsSaving(true);

      try {
        await invoke('update_character', {
          id: dataToSave.id,
          character: dataToSave,
        });

        // 1. Update Global Context (for Sidebar)
        updateCharacter(dataToSave);

        // 2. Update Local "Master" (to stop the Dirty check)
        setCharacter(dataToSave);

        console.log('✅ Save successful');
      } catch (err) {
        console.error('❌ Save failed:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [updateCharacter]
  );

  // 3. Save on localData changes with debounce, and also on unmount/character switch if dirty
  useEffect(() => {
    if (!localData) return;

    const currentSnapshot = JSON.stringify({
      name: localData.display_name,
      metadata: localData.metadata,
      role: localData.role,
    });

    // If the current text matches what we last saved, do nothing
    if (currentSnapshot === lastSavedData) return;

    const timer = setTimeout(() => {
      saveToBackend(localData);
      setLastSavedData(currentSnapshot);
    }, 300);

    return () => {
      clearTimeout(timer);
      // EMERGENCY CLEANUP: If we switch characters or unmount while "dirty"
      if (currentSnapshot !== lastSavedData) {
        invoke('update_character', { character: localData }).catch(() => {});
      }
    };
  }, [localData, lastSavedData, saveToBackend]);

  useEffect(() => {
    dataRef.current = localData;
    masterRef.current = character;
  }, [localData, character]);

  useEffect(() => {
    let unlistenFn: any;

    const init = async () => {
      const appWindow = getCurrentWindow();
      unlistenFn = await appWindow.listen(
        'tauri://close-requested',
        async () => {
          const current = dataRef.current;

          if (current) {
            // Create a promise that rejects after 500ms so the app doesn't hang
            const savePromise = invoke('update_character', {
              character: current,
            });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 500)
            );

            try {
              await Promise.race([savePromise, timeoutPromise]);
              console.log('Pre-close save successful');
            } catch (e) {
              console.error('Pre-close save failed or timed out', e);
            }
          }

          await appWindow.destroy();
        }
      );
    };

    init();
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

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
