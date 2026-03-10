import { useWorkspace } from '../../context/WorkspaceContext';

export default function ManuscriptContent() {
  const { documents } = useWorkspace();

  // Filter for top-level chapters
  const chapters = documents.filter((d) => d.docType === 'chapter');

  return (
    <div className="space-y-4">
      {chapters.map((ch) => (
        <div key={ch.id} className="group">
          <button className="flex items-start gap-2 text-sm font-semibold text-slate-700 w-full text-left hover:text-[#9333ea] transition-colors cursor-pointer">
            <span className="text-[10px] mt-1 text-slate-400 opacity-50">
              ▼
            </span>
            <div className="flex flex-col">
              <span>{ch.title}</span>
              <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tight">
                {ch.content.split(/\s+/).length} words
              </span>
            </div>
          </button>

          {/* We'll handle nested scenes here later using parentId */}
          <button className="ml-5 mt-2 text-[11px] text-slate-400 hover:text-[#9333ea] flex items-center gap-1 cursor-pointer">
            <span className="text-lg leading-none">+</span> Add scene...
          </button>
        </div>
      ))}

      <button className="w-full mt-6 py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-400 hover:border-purple-300 hover:text-purple-500 transition-all cursor-pointer">
        + Add Chapter...
      </button>
    </div>
  );
}
