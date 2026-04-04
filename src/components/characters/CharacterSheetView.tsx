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
  const [showSavingText, setShowSavingText] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [localData, setLocalData] = useState<any>(null);
  const [lastSavedData, setLastSavedData] = useState<string>('');

  const dataRef = useRef(localData);
  const masterRef = useRef(character);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayDataRef = useRef<any>(null);

  // 1. Fetch character data on mount or ID change
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      try {
        const data = await invoke<Character>('get_character', {
          id: characterId,
        });
        if (isMounted) {
          setCharacter(data);
          displayDataRef.current = { ...data };
          setLocalData({ ...data });
          // CRITICAL: Update the snapshot so the auto-save doesn't fire immediately
          setLastSavedData(
            JSON.stringify({
              name: data.display_name,
              metadata: data.metadata,
              role: data.role,
            })
          );
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Load failed:', err);
        setIsLoading(false);
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
      setShowSavingText(true);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

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
        saveTimeoutRef.current = setTimeout(() => {
          setShowSavingText(false);
        }, 1000);
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

  // Helper for metadata updates (nested objects)
  const handleMetadataUpdate = (key: string, value: any) => {
    setLocalData((prev: any) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  const handleNamePartUpdate = (
    first: string,
    middle: string,
    last: string,
    derivedFull: string
  ) => {
    setLocalData((prev: any) => ({
      ...prev,
      display_name: derivedFull, // instantly update the sidebar name as well
      metadata: {
        ...prev.metadata,
        first_name: first,
        middle_name: middle,
        last_name: last,
      },
    }));
  };

  // ONLY return the hard loader if we have zero data (initial boot)
  if (!localData && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 animate-pulse font-serif italic">
          Opening library...
        </div>
      </div>
    );
  }

  if (!localData) return null;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 relative">
      {/* Saving Indicator */}
      <div className="h-8 mb-2 flex justify-between items-center px-1">
        <div className="absolute top-4 right-6">
          {isLoading && (
            <span className="text-[9px] text-slate-300 animate-pulse uppercase">
              Syncing...
            </span>
          )}
        </div>

        <span
          className={`text-[10px] font-bold text-emerald-500 uppercase tracking-widest transition-opacity duration-500 ${showSavingText ? 'opacity-100' : 'opacity-0'}`}
        >
          {isSaving ? 'Saving to library...' : 'Changes persisted'}
        </span>
      </div>

      <div className={isLoading ? 'pointer-events-none' : ''}>
        <CharacterSheetHeader
          metadata={localData.metadata}
          role={localData.role}
          onSaveNameParts={handleNamePartUpdate}
        />

        <CharacterSheetIdentity
          character={localData}
          onUpdate={handleMetadataUpdate}
        />
      </div>
      {/* Next sections go here: Physical, Backstory, etc. */}
    </div>
  );
}
