import { useWorkspace } from '../../context/WorkspaceContext';

export default function CharacterTab() {
  const { character, updateCharacter, status } = useWorkspace();
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Characters</h1>
        <span className="text-xs text-slate-400 italic">{status}</span>
      </div>

      <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
          Character Name
        </label>
        <input
          value={character.name}
          onChange={(e) => updateCharacter(e.target.value)}
        />
        <p>{status}</p>
      </div>
    </div>
  );
}
