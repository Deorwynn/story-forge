import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspace } from '../../context/WorkspaceContext';
import ConfirmModal from '../shared/ConfirmModal';
import SidebarItem from '../layout/SidebarItem';

export default function ManuscriptContent() {
  const { project, documents, refreshDocuments } = useWorkspace();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const projectId = project?.id;
  const bookId =
    (project as any)?.books?.find(
      (b: any) => b.orderIndex === (project?.volumeNumber || 1) - 1
    )?.id || (project as any)?.books?.[0]?.id;

  const handleAddChapter = async () => {
    try {
      await invoke('create_document', {
        project_id: projectId,
        book_id: bookId,
        parent_id: null,
        doc_type: 'chapter',
      });
      refreshDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await invoke('delete_document', { id: deleteId });

      // Close modal first
      setDeleteId(null);

      // Refresh documents
      await refreshDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Could not delete: ' + err);
    }
  };

  return (
    <div className="space-y-1">
      {documents
        .filter((d) => d.docType === 'chapter')
        .map((ch) => (
          <SidebarItem
            key={ch.id}
            title={ch.title}
            subtitle="0 words"
            actions={[
              {
                label: 'Rename',
                icon: '✏️',
                onClick: () => console.log('Rename', ch.id),
              },
              {
                label: 'Delete',
                icon: '🗑️',
                onClick: () => setDeleteId(ch.id),
                variant: 'danger',
              },
            ]}
          />
        ))}

      <button
        onClick={handleAddChapter}
        className="w-full mt-4 py-2 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:border-purple-200 hover:text-purple-500 hover:bg-purple-50/30 transition-all cursor-pointer"
      >
        + New Chapter
      </button>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Chapter?"
        message="This action cannot be undone. All scenes inside this chapter will also be lost."
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
