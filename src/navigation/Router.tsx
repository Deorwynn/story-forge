import WriteTab from '../components/write/WriteTab';
import CharactersTab from '../components/characters/CharactersTab';

export type ForgeView =
  | 'Write'
  | 'Revisions'
  | 'Plot'
  | 'Characters'
  | 'Worldbuilding'
  | 'Research'
  | 'Braindump';

export const VIEW_COMPONENTS: Record<ForgeView, React.ComponentType<any>> = {
  Write: WriteTab,
  Revisions: () => (
    <div className="p-8 text-slate-400">Revisions View (Coming Soon)</div>
  ),
  Plot: () => <div className="p-8 text-slate-400">Plot View (Coming Soon)</div>,
  Characters: CharactersTab,
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
