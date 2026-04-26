import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCharacterPortrait } from '../useCharacterPortrait';
import {
  Character,
  TemporalField,
  PortraitFrame,
  MortalityType,
} from '../../types/character';

const mockBooks = [
  { id: 'vol-1', title: 'Book 1' },
  { id: 'vol-2', title: 'Book 2' },
  { id: 'vol-3', title: 'Book 3' },
];

const createTemporal = <T>(value: T): TemporalField<T> => ({
  global_value: value,
  book_overrides: {},
});

const defaultFrame: PortraitFrame = {
  path: null,
  zoom: 1,
  offset_x: 50,
  offset_y: 50,
};

const createMockCharacter = (overrides: Partial<Character> = {}): Character => {
  const baseMetadata = {
    first_name: 'Test',
    languages: [],
    race: createTemporal('Human'),
    occupation: createTemporal('None'),
    mortality: createTemporal('mortal' as MortalityType),
    age_value: createTemporal(null as number | null),
    age_is_unknown: createTemporal(true),
    portrait_data: createTemporal<PortraitFrame>(defaultFrame),
    ...overrides.metadata,
  };

  return {
    id: 'test-char-id',
    project_id: 'test-project-id',
    display_name: 'Test Character',
    role: 'Protagonist',
    portrait_path: null,
    is_global: true,
    last_modified: Date.now(),
    book_overrides: {},
    metadata: baseMetadata,
    ...overrides,
  } as Character;
};

describe('useCharacterPortrait', () => {
  it('should return master path when in Volume 1', () => {
    const localData = createMockCharacter({
      portrait_path: 'master.png',
    });

    const { result } = renderHook(() =>
      useCharacterPortrait(localData, 'vol-1', mockBooks, 0)
    );

    expect(result.current.displayPath).toBe('master.png');
  });

  it('should inherit master path in Volume 2 if no override exists', () => {
    const localData = createMockCharacter({
      portrait_path: 'master.png',
    });

    const { result } = renderHook(() =>
      useCharacterPortrait(localData, 'vol-2', mockBooks, 0)
    );

    expect(result.current.displayPath).toBe('master.png');
  });

  it('should use override path when present in sequel volume', () => {
    const localData = createMockCharacter({
      portrait_path: 'master.png',
      metadata: {
        ...createMockCharacter().metadata,
        portrait_data: {
          global_value: {
            path: 'master.png',
            zoom: 1,
            offset_x: 50,
            offset_y: 50,
          },
          book_overrides: {
            'vol-2': {
              path: 'sequel.png',
              zoom: 1,
              offset_x: 50,
              offset_y: 50,
            },
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useCharacterPortrait(localData, 'vol-2', mockBooks, 0)
    );

    expect(result.current.displayPath).toBe('sequel.png');
  });

  it('should skip an empty volume and inherit from the nearest ancestor', () => {
    const localData = createMockCharacter({
      portrait_path: 'master.png',
      metadata: {
        ...createMockCharacter().metadata,
        portrait_data: {
          global_value: {
            path: 'master.png',
            zoom: 1,
            offset_x: 50,
            offset_y: 50,
          },
          book_overrides: {
            'vol-1': {
              path: 'vol1-specific.png',
              zoom: 1,
              offset_x: 50,
              offset_y: 50,
            },
            // vol-2 is intentionally missing
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useCharacterPortrait(localData, 'vol-3', mockBooks, 0)
    );

    // Should find the vol-1 override since vol-2 is empty
    expect(result.current.displayPath).toBe('vol1-specific.png');
  });

  it('should inherit framing (zoom/offsets) from the nearest ancestor', () => {
    const localData = createMockCharacter({
      metadata: {
        ...createMockCharacter().metadata,
        portrait_data: {
          global_value: {
            path: 'master.png',
            zoom: 2.5,
            offset_x: 20,
            offset_y: 30,
          },
          book_overrides: {
            // Volume 2 is empty, should inherit Volume 1's zoom
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useCharacterPortrait(localData, 'vol-2', mockBooks, 0)
    );

    expect(result.current.displayPath).toBe('master.png');
    expect(result.current.effectiveFrame!.zoom).toBe(2.5);
    expect(result.current.effectiveFrame!.offset_x).toBe(20);
    expect(result.current.effectiveFrame!.offset_y).toBe(30);
  });

  it('should inherit path from master even if a sequel has a framing-only override', () => {
    const localData = createMockCharacter({
      portrait_path: 'master.png',
      metadata: {
        ...createMockCharacter().metadata,
        portrait_data: {
          global_value: {
            path: 'master.png',
            zoom: 1,
            offset_x: 50,
            offset_y: 50,
          },
          book_overrides: {
            'vol-2': {
              path: null, // User changed zoom but didn't upload a new file
              zoom: 3.0,
              offset_x: 10,
              offset_y: 10,
            },
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useCharacterPortrait(localData, 'vol-2', mockBooks, 0)
    );

    // Path should still be master, but zoom should be the sequel's
    expect(result.current.displayPath).toBe('master.png');
    expect(result.current.effectiveFrame!.zoom).toBe(3.0);
  });

  it('should fallback gracefully if book list is empty', () => {
    const localData = createMockCharacter({
      portrait_path: 'fallback.png',
    });

    const { result } = renderHook(
      () => useCharacterPortrait(localData, 'vol-1', [], 0) // Empty books array
    );

    expect(result.current.displayPath).toBe('fallback.png');
    expect(result.current.effectiveFrame!.zoom).toBe(1);
  });
});
