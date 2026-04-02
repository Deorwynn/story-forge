export interface Character {
  id: string;
  project_id: string;
  display_name: string; // The full name for the UI
  role: 'Main' | 'Supporting' | 'Side' | 'Other';
  metadata: {
    first_name: string;
    middle_name?: string;
    last_name?: string;
    base_age?: number;
    languages?: string[];
  };
  description: string;
  traits: string[];
  relationships: { targetId: string; description: string; type: string }[];
  arc: string;
  notes: string;
  occupation: string;
  customThemeColor?: string;
}
