import { Character, PortraitFrame } from '../types/character';

/**
 * Resolves which portrait framing to use based on the current book context.
 * It prioritizes the book-specific override, then falls back to the global look.
 */
export const getActivePortrait = (
  character: Character,
  currentBookId?: string | null
): PortraitFrame => {
  const data = character.metadata.portrait_data;

  // 1. Fallback for legacy data or if no portrait data exists yet
  const defaultFrame: PortraitFrame = {
    path: character.portrait_path || '',
    zoom: 1,
    offset_x: 50,
    offset_y: 50,
  };

  if (!data) return defaultFrame;

  // 2. Check for Book-Specific Override
  if (
    currentBookId &&
    data.book_overrides &&
    data.book_overrides[currentBookId]
  ) {
    const bookFrame = data.book_overrides[currentBookId];
    // Ensure we have a path, otherwise fall back to global
    if (bookFrame.path) return bookFrame;
  }

  // 3. Fallback to Global Value
  // If the global path is empty but the top-level cache has one, use the cache
  if (!data.global_value.path && character.portrait_path) {
    return { ...data.global_value, path: character.portrait_path };
  }

  return data.global_value || defaultFrame;
};
