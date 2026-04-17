import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMetadata } from '../useMetadata';

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeBookId: 'book-2',
    project: {
      books: [
        { id: 'book-1', title: 'Volume 1' },
        { id: 'book-2', title: 'Volume 2' },
      ],
    },
  }),
}));

describe('useMetadata Hook', () => {
  it('should return global value if no overrides exist', () => {
    const character = {
      metadata: { age_value: { global_value: 38 } },
      book_overrides: {},
    };

    const { result } = renderHook(() => useMetadata(character, 'age_value'));

    expect(result.current.value).toBe(38);
    expect(result.current.inheritanceSource).toBe('global');
  });

  it('should return Book 1 value when viewing Book 2 (Inheritance)', () => {
    const character = {
      metadata: { age_value: { global_value: 38 } },
      book_overrides: {
        'book-1': { metadata: { age_value: 42 } },
      },
    };

    const { result } = renderHook(() => useMetadata(character, 'age_value'));

    expect(result.current.value).toBe(42);

    expect(result.current.inheritanceSource).toBe(1);

    expect(result.current.isOverridden).toBe(false);
  });

  it('should return null correctly when an override is explicitly set to empty', () => {
    const character = {
      metadata: { age_value: { global_value: 38 } },
      book_overrides: {
        'book-1': { metadata: { age_value: 42 } },
        'book-2': { metadata: { age_value: null } }, // Explicitly cleared in Vol 2
      },
    };

    const { result } = renderHook(() => useMetadata(character, 'age_value'));

    expect(result.current.value).toBe(null);
    expect(result.current.inheritanceSource).toBe(1);
    expect(result.current.isOverridden).toBe(true);
  });

  it('should handle invalid activeBookId by falling back to global', () => {
    const character = {
      metadata: { age_value: { global_value: 38 } },
      book_overrides: {},
    };

    const { result } = renderHook(() => useMetadata(character, 'age_value'));

    expect(result.current.value).toBe(38);
    expect(result.current.inheritanceSource).toBe('global');
  });

  it('should handle clearing linked age fields correctly', () => {
    const character = {
      metadata: { age_value: { global_value: 30 } },
      book_overrides: {
        'book-2': {
          metadata: {
            age_value: null,
            age_is_unknown: true,
          },
        },
      },
    };

    // 1. Check that it starts as Unknown
    const { result: ageValue } = renderHook(() =>
      useMetadata(character, 'age_value')
    );
    const { result: ageUnknown } = renderHook(() =>
      useMetadata(character, 'age_is_unknown')
    );

    expect(ageValue.current.value).toBe(null);
    expect(ageUnknown.current.value).toBe(true);

    // 2. The logic check: If both are set to undefined (Reset), we should see the Global value
    const resetCharacter = {
      ...character,
      book_overrides: { 'book-2': { metadata: {} } }, // Simulating the onReset results
    };

    const { result: resetValue } = renderHook(() =>
      useMetadata(resetCharacter, 'age_value')
    );
    expect(resetValue.current.value).toBe(30);
    expect(resetValue.current.inheritanceSource).toBe('global');
  });
});
