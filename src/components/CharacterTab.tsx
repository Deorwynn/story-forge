interface Props {
  character: { name: string };
  onUpdate: (name: string) => void;
  status: string;
}

export default function CharacterTab({ character, onUpdate, status }: Props) {
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
          className="text-3xl font-bold text-slate-800 border-b border-transparent focus:border-[#9333ea] outline-none w-full pb-2"
          value={character.name}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="Elena Rivers"
        />
      </div>
    </div>
  );
}
