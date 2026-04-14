import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspace } from '../../context/WorkspaceContext';
import CharacterSheetHeader from './CharacterSheetHeader';
import CharacterSheetIdentity from './CharacterSheetIdentity';
import CharacterSheetDangerZone from './CharacterSheetDangerZone';
import { Character } from '../../types/character';

export default function CharacterSheetView({
  characterId,
}: {
  characterId: string;
}) {
  const { activeBookId, project, updateCharacter, refreshCharacters } =
    useWorkspace();
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
              book_overrides: data.book_overrides,
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
        setLocalData(dataToSave);

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
    if (!localData || isLoading) return;

    const currentSnapshot = JSON.stringify({
      name: localData.display_name,
      metadata: localData.metadata,
      role: localData.role,
      book_overrides: localData.book_overrides,
    });

    // If the current text matches what we last saved, do nothing
    if (currentSnapshot === lastSavedData) return;

    const timer = setTimeout(() => {
      saveToBackend(localData);
      setLastSavedData(currentSnapshot);
    }, 300);

    return () => {
      clearTimeout(timer);
      if (currentSnapshot !== lastSavedData) {
        invoke('update_character', {
          id: localData.id,
          character: localData,
        }).catch(() => {});
      }
    };
  }, [localData, lastSavedData, saveToBackend, activeBookId]);

  useEffect(() => {
    dataRef.current = localData;
    masterRef.current = character;
  }, [localData, character]);

  // Helper for metadata updates (nested objects)
  const handleMetadataUpdate = (key: string, value: any) => {
    setLocalData((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev };

      // --- RECONNECT / RESET LOGIC ---
      // If value is undefined, it's a signal to remove the override and link back
      if (value === undefined) {
        if (activeBookId && updated.book_overrides?.[activeBookId]?.metadata) {
          const newOverrides = { ...updated.book_overrides };
          const bookData = { ...newOverrides[activeBookId] };
          const newMetadata = { ...bookData.metadata };

          delete newMetadata[key];

          bookData.metadata = newMetadata;
          newOverrides[activeBookId] = bookData;
          updated.book_overrides = newOverrides;
        }
        return updated;
      }

      // Identify if we are in the "Master" book
      const isMasterBook =
        project?.type === 'standalone' ||
        project?.books?.[0]?.id === activeBookId;

      if (activeBookId && !isMasterBook) {
        // --- BOOK OVERRIDE LOGIC ---
        const allOverrides = { ...(updated.book_overrides || {}) };
        const specificBookData = { ...(allOverrides[activeBookId] || {}) };

        specificBookData.metadata = {
          ...(specificBookData.metadata || {}),
          [key]: value,
        };

        allOverrides[activeBookId] = specificBookData;
        updated.book_overrides = allOverrides;
      } else {
        // --- GLOBAL VALUE LOGIC ---
        // If we are in the master book OR no book is active, update the Series Bible
        const newMetadata = {
          ...(updated.metadata || {}),
          [key]: value,
        };

        // Special handling for Age: because it has a nested 'global_value'
        if (key === 'age') {
          newMetadata.age = {
            ...(updated.metadata?.age || {}),
            global_value: value, // value here is the {value, mortality, is_unknown} object
          };
        }

        updated.metadata = newMetadata;

        // Sync root fields for the sidebar (Race/Gender etc)
        if (key === 'race') updated.race = value;
        if (key === 'gender') updated.gender = value;
      }

      return updated;
    });
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

  const handleDeleted = async () => {
    // 1. Tell the sidebar to refresh its list
    await refreshCharacters();

    // 2. Tell App.tsx there is no longer an active character
    updateCharacter(null);
  };

  const hideInheritance =
    project?.type === 'standalone' || project?.books?.[0]?.id === activeBookId;

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
          isMasterBook={hideInheritance}
        />

        <CharacterSheetDangerZone
          characterId={characterId}
          characterName={localData.display_name}
          onDeleted={handleDeleted}
        />
      </div>
      {/* Next sections go here: Physical, Backstory, etc. */}
    </div>
  );
}
