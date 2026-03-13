import { GENRES } from './EditProjectForm';

export default function GenreSelector({
  selected,
  onToggle,
  max = 3,
}: {
  selected: string[];
  onToggle: (label: string) => void;
  max?: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {GENRES.map((g) => {
        const isSelected = selected.includes(g.label);
        const isDisabled = !isSelected && selected.length >= max;

        return (
          <button
            key={g.label}
            type="button"
            disabled={isDisabled}
            onClick={() => onToggle(g.label)}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer
              ${
                isSelected
                  ? 'bg-purple-50 border-[#9333ea] text-[#9333ea] shadow-sm'
                  : isDisabled
                    ? 'opacity-40 grayscale cursor-not-allowed border-slate-50 bg-slate-50'
                    : 'bg-slate-50 border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'
              }`}
          >
            <span className="text-xl mb-1">{g.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-tight">
              {g.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
