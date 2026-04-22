/**
 * Resolves which portrait framing to use based on the current book context.
 * It prioritizes the book-specific override, then falls back to the global look.
 */
export function getActivePortrait(
  metadata: any,
  currentBookId?: string | null
) {
  const data = metadata?.portrait_data;
  if (!data) return undefined;

  // Specific Book Override (Highest Priority)
  if (currentBookId && data.book_overrides?.[currentBookId]) {
    return data.book_overrides[currentBookId];
  }

  const overrideIds = Object.keys(data.book_overrides || {});
  if (!currentBookId && overrideIds.length === 1) {
    return data.book_overrides[overrideIds[0]];
  }

  // Global Fallback
  if (data.global_value && data.global_value.zoom > 0) {
    return data.global_value;
  }

  return undefined;
}
