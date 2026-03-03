export interface Character {
  id: string;
  name: string;
  role: 'Main' | 'Supporting' | 'Side' | 'Other';
  description: string;
  traits: string[];
  relationships: { targetId: string; description: string; type: string }[];
  arc: string;
  notes: string;
  age: string;
  occupation: string;
  customThemeColor?: string;
}
