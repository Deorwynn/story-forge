import { invoke } from '@tauri-apps/api/core';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function ManuscriptContent() {
  const { project, documents, refreshDocuments } = useWorkspace();

  const projectId = project?.id;
  const projectAny = project as any;
  const books = projectAny?.books || [];

  // look for the book where order_index matches our volume (minus 1)
  // or fallback to the first book available
  const bookId =
    books.find((b: any) => b.orderIndex === (project?.volumeNumber || 1) - 1)
      ?.id || books[0]?.id;

  const handleAddChapter = async () => {
    try {
      await invoke('create_document', {
        project_id: projectId,
        book_id: bookId,
        parent_id: null,
        doc_type: 'chapter',
      });

      // refresh just the docs instead of the whole window
      refreshDocuments();
    } catch (err) {
      console.error('RUST ERROR:', err);
    }
  };

  const chapters = documents.filter((d) => d.docType === 'chapter');

  return (
    <div className="space-y-4">
      {chapters.map((ch) => (
        <div key={ch.id} className="group">
          <button className="flex items-start gap-2 text-sm font-semibold text-slate-700 w-full text-left hover:text-[#9333ea] transition-colors">
            <span className="text-[10px] mt-1 text-slate-400 opacity-50">
              ▼
            </span>
            <div className="flex flex-col">
              <span>{ch.title}</span>
              <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tight">
                0 words
              </span>
            </div>
          </button>
        </div>
      ))}

      <button
        onClick={handleAddChapter}
        className="w-full mt-6 py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-400 hover:border-purple-300 hover:text-purple-500 transition-all cursor-pointer"
      >
        + Add Chapter...
      </button>
    </div>
  );
}
