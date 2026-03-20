import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Plus, FileText, CornerDownRight } from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';
import SidebarItem from '../layout/SidebarItem';

export default function ManuscriptContent() {
  const { project, documents, refreshDocuments } = useWorkspace();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const projectId = project?.id;
  const bookId =
    project?.type === 'standalone'
      ? project.books?.[0]?.id // Standalone: Always use the only book available
      : project?.books?.find(
          // Series: Find by volume number
          (b: any) => b.orderIndex === (project?.volumeNumber || 1) - 1
        )?.id || project?.books?.[0]?.id;

  useEffect(() => {
    if (projectId) {
      invoke<string[]>('get_expanded_chapters', { project_id: projectId })
        .then((ids) => {
          setExpandedChapters(new Set(ids));
          setIsHydrated(true);
        })
        .catch((err) => {
          console.error(err);
          setIsHydrated(true);
        });
    }
  }, [projectId]);

  // Auto-save expanded states when they change
  useEffect(() => {
    if (!isHydrated) return;

    const timer = setTimeout(() => {
      if (projectId) {
        invoke('set_expanded_chapters', {
          project_id: projectId,
          ids: Array.from(expandedChapters),
        }).catch(console.error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [expandedChapters, projectId, isHydrated]);

  const handleAddDocument = async (
    parentId: string | null = null,
    type: 'chapter' | 'scene'
  ) => {
    try {
      await invoke('create_document', {
        book_id: bookId,
        parent_id: parentId,
        doc_type: type,
      });

      // Refresh the sidebar list
      await refreshDocuments();

      // If it's a scene, make sure the parent chapter is expanded
      if (parentId && type === 'scene') {
        setExpandedChapters((prev) => {
          const newSet = new Set(prev);
          newSet.add(parentId);
          return newSet;
        });
      }
    } catch (err) {
      console.error('FORGE ERROR in handleAddDocument:', err);
      alert(`Failed to create ${type}: ${err}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !bookId) return;
    try {
      await invoke('delete_document', {
        id: deleteId,
        book_id: bookId, // Required for cascade re-index
      });
      setDeleteId(null);
      await refreshDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      await invoke('rename_document', { id, new_title: newTitle });
      refreshDocuments();
    } catch (err) {
      console.error(err);
    } finally {
      setRenamingId(null);
    }
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getDocActions = (doc: any) => [
    {
      label: 'Rename',
      icon: '✏️',
      onClick: () => setRenamingId(doc.id),
    },
    {
      label: 'Settings',
      icon: '⚙️',
      onClick: () => console.log('Settings', doc.id),
    },
    {
      label: 'Delete',
      icon: '🗑️',
      variant: 'danger' as const,
      onClick: () => setDeleteId(doc.id),
    },
  ];

  const chapters = documents
    .filter((d) => d.docType === 'chapter')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  if (!isHydrated) {
    return (
      <div className="p-6 text-slate-300 animate-pulse text-xs tracking-widest uppercase">
        Loading Manuscript...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {chapters.map((ch) => {
        const isCollapsed = !expandedChapters.has(ch.id);
        const scenes = documents
          .filter((d) => d.parentId === ch.id)
          .sort((a, b) => a.orderIndex - b.orderIndex);

        return (
          <div key={ch.id} className="flex flex-col">
            <SidebarItem
              title={ch.title}
              subtitle={`0 words • ${scenes.length} ${scenes.length === 1 ? 'scene' : 'scenes'}`}
              isCollapsible
              isCollapsed={isCollapsed}
              onToggle={() => toggleChapter(ch.id)}
              actions={getDocActions(ch)}
              icon={
                <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
              }
              isRenamingInitial={renamingId === ch.id}
              onRename={(newTitle) => handleRename(ch.id, newTitle)}
            />

            {!isCollapsed && (
              <div className="flex flex-col mt-0.5">
                {scenes.map((scene) => (
                  <SidebarItem
                    key={scene.id}
                    title={scene.title}
                    subtitle="0 words"
                    level={1}
                    actions={getDocActions(scene)}
                    icon={
                      <CornerDownRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    }
                    isRenamingInitial={renamingId === scene.id}
                    onRename={(newTitle) => handleRename(scene.id, newTitle)}
                  />
                ))}
                <button
                  onClick={() => handleAddDocument(ch.id, 'scene')}
                  className="ml-9 py-1.5 text-left text-[12px] text-slate-400 hover:text-purple-500 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add scene</span>
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={() => handleAddDocument(null, 'chapter')}
        className="w-full mt-4 py-2 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:border-purple-200 hover:text-purple-500 hover:bg-purple-50/30 transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Chapter</span>
      </button>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Item?"
        message="This will move the item to trash. You can restore it later."
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
