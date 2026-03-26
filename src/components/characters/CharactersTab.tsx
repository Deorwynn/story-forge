import Stage from '../layout/Stage';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function CharacterTab() {
  const { character, updateCharacter, status } = useWorkspace();

  return (
    <Stage variant="wide">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800 font-serif">
          Characters
        </h1>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 italic">
          {status}
        </span>
      </div>

      <div className="bg-white border border-slate-200 p-10 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
        <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3">
          Character Name
        </label>
        <input
          className="w-full text-xl font-medium text-slate-800 bg-transparent border-b border-slate-100 focus:border-purple-400 outline-none pb-2 transition-colors"
          value={character.name}
          onChange={(e) => updateCharacter(e.target.value)}
          placeholder="e.g. Alaric the Bold"
        />
      </div>
    </Stage>
  );
}
