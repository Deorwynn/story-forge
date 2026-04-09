export type MortalityType = 'mortal' | 'ageless' | 'immortal';

export interface AgeData {
  value: number | null;
  is_unknown: boolean;
  mortality: MortalityType;
}

export interface TemporalField<T> {
  global_value: T;
  book_overrides: Record<string, T>;
}

export interface Character {
  id: string;
  project_id: string;
  book_id?: string | null;
  display_name: string;
  role: string;
  race: string;
  portrait_path?: string | null;
  is_global: boolean;
  last_modified: number;
  book_overrides?: Record<string, any>;
  metadata: {
    first_name: string;
    middle_name?: string;
    last_name?: string;
    nickname?: string;
    gender?: string;
    age: TemporalField<AgeData>;
    languages: string[];
  };
  // Note: These fields will likely go into 'metadata' eventually
  // to be "Temporal/Book-specific"
  description?: string;
  traits?: string[];
  arc?: string;
  notes?: string;
  occupation?: string;
}
