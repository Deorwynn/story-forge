import { useMemo, useState, useEffect } from 'react';
import { appDataDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Character, PortraitFrame } from '../types/character';

export function useCharacterPortrait(
  character: Character | null,
  activeBookId: string | null,
  projectBooks: any[] | null | undefined,
  version: number
) {
  // 1. Determine the "Effective" Frame (Inheritance Logic)
  const effectiveFrame = useMemo(() => {
    if (!character) return null; // Only bail if there's no character at all

    // 1. If we have books and an active ID, try the walkback
    if (projectBooks && activeBookId) {
      const currentIndex = projectBooks.findIndex((b) => b.id === activeBookId);
      if (currentIndex !== -1) {
        for (let i = currentIndex; i >= 0; i--) {
          const bid = projectBooks[i].id;
          const override =
            character.metadata?.portrait_data?.book_overrides?.[bid];
          if (override?.path && override.path.trim() !== '') {
            return override;
          }
        }
      }
    }

    // 2. FALLBACK: Global Portrait
    const global = character.metadata?.portrait_data?.global_value;
    if (global?.path && global.path.trim() !== '') return global;

    // 3. LAST RESORT: Legacy flat column
    if (character.portrait_path) {
      return {
        path: character.portrait_path,
        zoom: 1,
        offset_x: 50,
        offset_y: 50,
      } as PortraitFrame;
    }

    return null;
  }, [character, activeBookId, projectBooks, version]);

  // 2. Resolve the Asset URL (Tauri Logic)
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const resolve = async () => {
      if (effectiveFrame?.path) {
        try {
          const appData = await appDataDir();
          const fullPath = await join(appData, 'assets', effectiveFrame.path);
          if (isMounted) setPortraitUrl(convertFileSrc(fullPath));
        } catch (err) {
          if (isMounted) setPortraitUrl(null);
        }
      } else {
        if (isMounted) setPortraitUrl(null);
      }
    };

    resolve();
    return () => {
      isMounted = false;
    };
  }, [effectiveFrame?.path, version]);

  return {
    effectiveFrame,
    portraitUrl,
    displayPath: effectiveFrame?.path || null,
  };
}
