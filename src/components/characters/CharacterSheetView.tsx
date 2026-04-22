import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { PortraitFrame } from '../../types/character';
import { useWorkspace } from '../../context/WorkspaceContext';
import CharacterSheetHeader from './CharacterSheetHeader';
import CharacterSheetIdentity from './CharacterSheetIdentity';
import CharacterSheetDangerZone from './CharacterSheetDangerZone';
import { Character } from '../../types/character';
import CharacterSheetAppearance from './CharacterSheetAppearance';

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
  const [portraitVersion, setPortraitVersion] = useState(0);

  const dataRef = useRef(localData);
  const masterRef = useRef(character);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInternalUpdating = useRef(false);

  // 1. Fetch character data on mount or ID change
  const loadData = useCallback(async () => {
    if (!localData) setIsLoading(true);
    try {
      const data = await invoke<Character>('get_character', {
        id: characterId,
      });
      setCharacter(data);
      setLocalData({ ...data });
      setLastSavedData(
        JSON.stringify({
          name: data.display_name,
          metadata: data.metadata,
          role: data.role,
          book_overrides: data.book_overrides,
          portrait_path: data.portrait_path,
        })
      );
    } catch (err) {
      console.error('Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);

  // 2. Update your existing useEffect to use this function
  useEffect(() => {
    loadData();
  }, [loadData, activeBookId]);

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
    if (!localData || isLoading || isInternalUpdating.current) return;

    const currentSnapshot = JSON.stringify({
      name: localData.display_name,
      metadata: localData.metadata,
      role: localData.role,
      book_overrides: localData.book_overrides,
      portrait_path: localData.portrait_path,
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

  const handleMetadataUpdate = (key: string, value: any) => {
    setLocalData((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev };

      // --- RESET LOGIC ---
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

      const isMasterBook = project?.books?.[0]?.id === activeBookId;

      if (activeBookId && !isMasterBook) {
        // --- BOOK OVERRIDE (Volumes 2+) ---
        const allOverrides = { ...(updated.book_overrides || {}) };
        const specificBookData = { ...(allOverrides[activeBookId] || {}) };
        const newBookMetadata = { ...(specificBookData.metadata || {}) };

        newBookMetadata[key] = value;

        specificBookData.metadata = newBookMetadata;
        allOverrides[activeBookId] = specificBookData;
        updated.book_overrides = allOverrides;
      } else {
        // --- GLOBAL VALUE (Volume 1 / Standalone) ---
        const newMetadata = { ...(updated.metadata || {}) };

        // Unified Logic: If it's a metadata field, wrap it for Rust's TemporalField
        const metadataFields = [
          'race',
          'occupation',
          'gender',
          'mortality',
          'perception',
          'age_value',
          'age_is_unknown',
          'height',
          'physique',
          'apparent_age',
          'hair',
          'eye_color',
          'scars',
          'tattoos',
          'distinctive_features',
          'clothing_style',
          'posture_gait',
          'color_palette',
        ];

        if (metadataFields.includes(key)) {
          // Check if current is already an object, else start fresh
          const currentField =
            typeof newMetadata[key] === 'object' && newMetadata[key] !== null
              ? newMetadata[key]
              : {};

          newMetadata[key] = {
            ...currentField,
            global_value: value,
            book_overrides: newMetadata[key]?.book_overrides || {},
          };
        }

        updated.metadata = newMetadata;
      }
      return updated;
    });
  };

  const handlePortraitUpdate = async (newPath: string) => {
    try {
      const defaults = { zoom: 1.0, offset_x: 50.0, offset_y: 50.0 };

      await invoke('update_character_portrait', {
        id: characterId,
        path: newPath,
        book_id: activeBookId,
        ...defaults,
      });

      // Update local state so UI is in sync
      setLocalData((prev: any) => {
        const updated = { ...prev, portrait_path: newPath };
        // Manual snapshot update to prevent auto-save collision
        setLastSavedData(
          JSON.stringify({
            name: updated.display_name,
            metadata: updated.metadata,
            role: updated.role,
            book_overrides: updated.book_overrides,
            portrait_path: updated.portrait_path,
          })
        );
        return updated;
      });

      setPortraitVersion((v) => v + 1);
    } catch (err) {
      console.error('Failed to update portrait:', err);
    }
  };

  const handleUpdateFraming = async (frame: PortraitFrame) => {
    isInternalUpdating.current = true;
    setIsSaving(true);

    try {
      await invoke('update_character_portrait', {
        id: characterId,
        // If frame.path is empty, send the current localData path
        path: frame.path || localData.portrait_path,
        book_id: activeBookId,
        zoom: frame.zoom,
        offset_x: frame.offset_x,
        offset_y: frame.offset_y,
      });

      await loadData();
      setPortraitVersion((v) => v + 1);
    } catch (err) {
      console.error('Framing save failed:', err);
    } finally {
      isInternalUpdating.current = false;
      setIsSaving(false);
    }
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

  const hideInheritance = useMemo(() => {
    if (!project || !project.books || project.books.length === 0) return true;
    if (project.type === 'standalone') return true;

    const firstBookId = project.books[0]?.id;

    const isActiveInThisProject = project.books.some(
      (b) => b.id === activeBookId
    );

    // If it's not in this project, we're mid-switch.
    // Treat it as Volume 1 (hide icons) until the context catches up.
    if (!isActiveInThisProject) {
      return true;
    }

    const result = firstBookId === activeBookId;
    return result;
  }, [project, activeBookId]);

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
          portraitPath={localData.portrait_path}
          portraitVersion={portraitVersion}
          currentBookId={activeBookId}
          onSaveNameParts={handleNamePartUpdate}
          onUpdatePortrait={handlePortraitUpdate}
          onUpdateFraming={handleUpdateFraming}
        />

        <CharacterSheetIdentity
          character={localData}
          onUpdate={handleMetadataUpdate}
          isMasterBook={hideInheritance}
        />

        <CharacterSheetAppearance
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
