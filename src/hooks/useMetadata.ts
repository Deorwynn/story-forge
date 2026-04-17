import { useWorkspace } from '../context/WorkspaceContext';
import { useMemo } from 'react';

export function useMetadata(character: any, path: string) {
  const { activeBookId, project } = useWorkspace();

  const bookExists = useMemo(() => {
    return project?.books?.some((b: any) => b.id === activeBookId) ?? false;
  }, [project, activeBookId]);

  const result = useMemo(() => {
    if (!character || !project?.books) {
      return {
        value: '',
        inheritanceSource: 'global' as const,
        isOverridden: false,
      };
    }

    const books = project.books;
    const currentIndex = books.findIndex((b: any) => b.id === activeBookId);

    // 1. Resolve Effective Value (Walkback Logic)
    let effectiveValue = undefined;
    let foundAtStep = -1;

    if (bookExists && currentIndex !== -1) {
      for (let i = currentIndex; i >= 0; i--) {
        const bookId = books[i].id;
        const metadata = character.book_overrides?.[bookId]?.metadata;

        // Check if the key exists in the object, even if the value is null
        if (metadata && Object.prototype.hasOwnProperty.call(metadata, path)) {
          effectiveValue = metadata[path];
          foundAtStep = i;
          break;
        }
      }
    }

    // 2. Fallback to Global if no book overrides found
    if (effectiveValue === undefined) {
      const globalData = character.metadata?.[path];
      if (globalData !== undefined) {
        effectiveValue =
          typeof globalData === 'object' && globalData !== null
            ? globalData.global_value
            : globalData;
      }
    }

    // 3. Determine Inheritance Info
    const currentMetadata =
      currentIndex !== -1
        ? character.book_overrides?.[books[currentIndex].id]?.metadata
        : null;

    const isOverridden =
      !!currentMetadata &&
      Object.prototype.hasOwnProperty.call(currentMetadata, path);

    let source: number | 'global' | null = 'global';

    if (currentIndex === 0) {
      source = null; // Master book doesn't "inherit" from anyone
    } else if (foundAtStep !== -1 && foundAtStep < currentIndex) {
      source = foundAtStep + 1; // Inherited from a previous specific book
    } else if (foundAtStep === currentIndex) {
      // It's overridden here, but where would it have come from?
      // Find the "potential" source for the reset button
      source = 'global';
      for (let i = currentIndex - 1; i >= 0; i--) {
        const prevMetadata = character.book_overrides?.[books[i].id]?.metadata;
        if (
          prevMetadata &&
          Object.prototype.hasOwnProperty.call(prevMetadata, path)
        ) {
          source = i + 1;
          break;
        }
      }
    }

    const finalLogicValue =
      effectiveValue === undefined ? null : effectiveValue;

    return {
      value: finalLogicValue,
      inheritanceSource: source,
      isOverridden,
      smartProps: {
        value: finalLogicValue ?? '',
        inheritanceSource: source,
        isOverridden,
        id: path,
      },
    };
  }, [character, path, activeBookId, project, bookExists]);

  return { ...result, bookExists };
}
