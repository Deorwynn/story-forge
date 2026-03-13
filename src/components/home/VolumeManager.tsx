import { Plus, Trash2 } from 'lucide-react';

export default function VolumeManager({
  titles,
  onChange,
  showDelete = true,
}: {
  titles: string[];
  onChange: (newTitles: string[]) => void;
  showDelete?: boolean;
}) {
  const addVolume = () => onChange([...titles, `Volume ${titles.length + 1}`]);

  const removeVolume = (index: number) => {
    if (titles.length > 1) {
      onChange(titles.filter((_, i) => i !== index));
    }
  };

  const updateTitle = (index: number, val: string) => {
    const newTitles = [...titles];
    newTitles[index] = val;
    onChange(newTitles);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {titles.map((title, i) => (
          <div
            key={i}
            className="group relative flex items-center bg-slate-50 border border-slate-100 rounded-2xl focus-within:border-purple-200 focus-within:bg-white transition-all"
          >
            <div className="flex items-center justify-center pl-4 pr-2 text-[10px] font-black text-slate-300">
              {String(i + 1).padStart(2, '0')}
            </div>
            <input
              className="w-full py-4 pr-12 bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300"
              value={title}
              placeholder="Untitled Volume"
              onChange={(e) => updateTitle(i, e.target.value)}
            />
            {/* Conditional Delete */}
            {showDelete && i >= 1 && (
              <button
                onClick={() => removeVolume(i)}
                className="absolute right-2 p-2 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addVolume}
        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50/50 transition-all flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest cursor-pointer"
      >
        <Plus size={16} />
        Add Volume
      </button>
    </div>
  );
}
