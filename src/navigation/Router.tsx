import CharacterTab from '../components/characters/CharacterTab';

export type ForgeView =
  | 'Write'
  | 'Revisions'
  | 'Plot'
  | 'Characters'
  | 'Worldbuilding'
  | 'Research'
  | 'Braindump';

export const VIEW_COMPONENTS: Record<ForgeView, React.ComponentType<any>> = {
  Write: () => (
    <div className="p-8 text-slate-400">Write View (Coming Soon)</div>
  ),
  Revisions: () => (
    <div className="p-8 text-slate-400">Revisions View (Coming Soon)</div>
  ),
  Plot: () => <div className="p-8 text-slate-400">Plot View (Coming Soon)</div>,
  Characters: CharacterTab,
  Worldbuilding: () => (
    <div className="p-8 text-slate-400">Worldbuilding View (Coming Soon)</div>
  ),
  Research: () => (
    <div className="p-8 text-slate-400">Research View (Coming Soon)</div>
  ),
  Braindump: () => (
    <div className="p-8 text-slate-400">Braindump View (Coming Soon)</div>
  ),
};
