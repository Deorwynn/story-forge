import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  const [animatingOutId, setAnimatingOutId] = useState<string | null>(null);
  const [isSwitchingBook, setIsSwitchingBook] = useState(false);
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // Track first mount to prevent "sliding open" on app launch
  const isFirstRender = useRef(true);

  const projectId = project?.id;
  const bookId =
    project?.type === 'standalone'
      ? project.books?.[0]?.id // Standalone: Always use the only book available
      : project?.books?.find(
          // Series: Find by volume number
          (b: any) => b.orderIndex === (project?.volumeNumber || 1) - 1
        )?.id || project?.books?.[0]?.id;

  // Reset first render flag when switching books or after initial hydration
  useEffect(() => {
    if (isHydrated) {
      const timer = setTimeout(() => {
        isFirstRender.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isHydrated, bookId]);

  useEffect(() => {
    setIsSwitchingBook(true);
    const timer = setTimeout(() => setIsSwitchingBook(false), 50);
    return () => clearTimeout(timer);
  }, [bookId]);

  useEffect(() => {
    setIsLayoutReady(false);
    const timer = setTimeout(() => setIsLayoutReady(true), 100);
    return () => clearTimeout(timer);
  }, [bookId]);

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
      // 1. Mark this ID as "animating out"
      setAnimatingOutId(deleteId);

      // 2. Wait a tiny bit for the Framer 'exit' animation to start/finish
      await new Promise((resolve) => setTimeout(resolve, 250));

      // 3. Now perform the actual database delete
      await invoke('delete_document', {
        id: deleteId,
        book_id: bookId,
      });

      // 4. Cleanup and refresh
      setDeleteId(null);
      setAnimatingOutId(null);
      await refreshDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
      setAnimatingOutId(null);
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
    .filter(
      (d) => d.docType === 'chapter' && d.id && String(d.id).trim() !== ''
    )
    // Ensure the one we are deleting doesn't just vanish from the array
    // until the animation is done.
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div key={bookId || 'no-book'} className={'flex flex-col transition-all'}>
      {!isHydrated ? (
        <div className="p-6 text-slate-300 animate-pulse text-xs tracking-widest uppercase">
          Loading...
        </div>
      ) : (
        <>
          <AnimatePresence initial={false}>
            {chapters.map((ch, idx) => {
              const isCollapsed = !expandedChapters.has(ch.id);
              const scenes = documents
                .filter(
                  (d) =>
                    d.parentId === ch.id && d.id && String(d.id).trim() !== ''
                )
                .sort((a, b) => a.orderIndex - b.orderIndex);

              return (
                <motion.div
                  key={ch.id}
                  layout={
                    !isSwitchingBook && animatingOutId !== null
                      ? 'position'
                      : false
                  }
                  initial={
                    isFirstRender.current ? false : { opacity: 0, height: 0 }
                  }
                  animate={{
                    opacity: 1,
                    scale: 1,
                    height: 'auto',
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    height: 0,
                    transition: {
                      opacity: { duration: 0.2 },
                      scale: { duration: 0.2 },
                      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                    },
                  }}
                  className="flex flex-col overflow-hidden"
                  style={{ transformOrigin: 'center top' }}
                >
                  <SidebarItem
                    title={ch.title}
                    index={idx}
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
                      <AnimatePresence initial={false}>
                        {scenes.map((scene, sIdx) => {
                          return (
                            <motion.div
                              key={scene.id}
                              layoutDependency={documents.length}
                              layout={
                                animatingOutId !== null ? 'position' : false
                              }
                              initial={false}
                              animate={{
                                opacity: 1,
                                scale: 1,
                                height: 'auto',
                              }}
                              exit={{
                                opacity: 0,
                                scale: 0.95,
                                height: 0,
                                transition: {
                                  opacity: { duration: 0.2 },
                                  scale: { duration: 0.2 },
                                  height: {
                                    duration: 0.3,
                                    ease: [0.4, 0, 0.2, 1],
                                  },
                                },
                              }}
                              style={{ transformOrigin: 'center top' }}
                              className="overflow-hidden"
                            >
                              <SidebarItem
                                key={scene.id}
                                index={sIdx}
                                title={scene.title}
                                subtitle="0 words"
                                level={1}
                                actions={getDocActions(scene)}
                                icon={
                                  <CornerDownRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                }
                                isRenamingInitial={renamingId === scene.id}
                                onRename={(newTitle) =>
                                  handleRename(scene.id, newTitle)
                                }
                              />
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      <motion.button
                        layoutDependency={scenes.length}
                        layout="position"
                        transition={{
                          layout: {
                            type: 'tween',
                            ease: [0.4, 0, 0.2, 1],
                            duration: 0.3,
                          },
                        }}
                        onClick={() => handleAddDocument(ch.id, 'scene')}
                        className="ml-9 py-1.5 text-left text-[12px] text-slate-400 hover:text-purple-500 transition-colors cursor-pointer flex items-center gap-2 sidebar-item-animate"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add scene</span>
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          <AnimatePresence>
            {isHydrated && isLayoutReady && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.2,
                  ease: 'easeOut',
                  layout: {
                    type: 'tween',
                    ease: [0.4, 0, 0.2, 1],
                    duration: 0.3,
                  },
                }}
                key={`add-btn-${bookId}`}
                onClick={() => handleAddDocument(null, 'chapter')}
                className="w-full mt-4 py-2 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:border-purple-200 hover:text-purple-500 hover:bg-purple-50/30 transition-all cursor-pointer flex items-center justify-center gap-2 sidebar-item-animate outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Chapter</span>
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}

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
