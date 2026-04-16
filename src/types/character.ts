export type MortalityType = 'mortal' | 'ageless' | 'immortal';

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
    languages: string[];
    race: TemporalField<string>;
    occupation: TemporalField<string>;
    mortality: TemporalField<MortalityType>;
    age_value: TemporalField<number | null>;
    age_is_unknown: TemporalField<boolean>;
    perception?: TemporalField<string>;
  };
  description?: string;
  traits?: string[];
  arc?: string;
  notes?: string;
}
