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
    if (!character) return null;

    const overrides = character.metadata?.portrait_data?.book_overrides || {};
    const global = character.metadata?.portrait_data?.global_value;

    // 1. RESOLVE IMAGE PATH (The "Source")
    let winningPath = '';
    if (projectBooks && activeBookId) {
      const currentIndex = projectBooks.findIndex((b) => b.id === activeBookId);
      if (currentIndex !== -1) {
        for (let i = currentIndex; i >= 0; i--) {
          const bid = projectBooks[i].id;
          if (overrides[bid]?.path?.trim()) {
            winningPath = overrides[bid].path;
            break;
          }
        }
      }
    }
    if (!winningPath)
      winningPath = global?.path || character.portrait_path || '';
    if (!winningPath) return null;

    // 2. RESOLVE FRAMING (The "Zoom/Offset")
    // We walk back from the current book to find the FIRST defined zoom/offset
    let winningZoom = 1.0;
    let winningX = 50.0;
    let winningY = 50.0;
    let framingFound = false;

    if (projectBooks && activeBookId) {
      const currentIndex = projectBooks.findIndex((b) => b.id === activeBookId);
      if (currentIndex !== -1) {
        for (let i = currentIndex; i >= 0; i--) {
          const bid = projectBooks[i].id;
          const ov = overrides[bid];
          // We check if the override exists AND has a non-zero zoom
          if (ov && ov.zoom && ov.zoom !== 0) {
            winningZoom = ov.zoom;
            winningX = ov.offset_x;
            winningY = ov.offset_y;
            framingFound = true;
            break;
          }
        }
      }
    }

    // Fallback to Global if no volume defined its own framing
    if (!framingFound && global && global.zoom) {
      winningZoom = global.zoom;
      winningX = global.offset_x;
      winningY = global.offset_y;
    }

    return {
      path: winningPath,
      zoom: winningZoom,
      offset_x: winningX,
      offset_y: winningY,
    } as PortraitFrame;
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
