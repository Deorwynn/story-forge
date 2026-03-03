export default function Sidebar() {
  const sections = [
    'Main Characters',
    'Supporting Characters',
    'Side Characters',
    'Other Characters',
  ];
  return (
    <aside className="w-64 bg-[#f1f5f9] border-r border-slate-200 p-4 h-full">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
        Characters
      </h3>
      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s}>
            <button className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="text-[10px]">▼</span> {s}{' '}
              <span className="text-slate-400 font-normal ml-auto">0</span>
            </button>
            <button className="ml-5 mt-1 text-xs text-slate-400 hover:text-[#9333ea]">
              + Add character...
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
