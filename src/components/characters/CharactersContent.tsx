export default function CharactersContent() {
  const sections = [
    'Main Characters',
    'Supporting Characters',
    'Side Characters',
    'Other Characters',
  ];

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <div key={s}>
          <button className="flex items-center gap-2 text-sm font-semibold text-slate-700 w-full text-left group hover:text-[#9333ea] transition-colors">
            <span className="text-[10px] text-slate-400 opacity-50 transition-transform group-hover:rotate-90">
              ▼
            </span>
            {s}
            <span className="text-slate-400 font-normal ml-auto text-xs">
              0
            </span>
          </button>
          <button className="ml-5 mt-1 text-[11px] text-slate-400 hover:text-[#9333ea] flex items-center gap-1 transition-colors">
            <span className="text-lg leading-none">+</span> Add character...
          </button>
        </div>
      ))}
    </div>
  );
}
