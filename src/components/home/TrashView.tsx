import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Project } from '../../types/project';
import { mapRawProject } from '../../utils/projectMapper';
import Button from '../shared/Button';
import ConfirmModal from '../shared/ConfirmModal';

export default function TrashView({ onBack }: { onBack: () => void }) {
  const [trashedProjects, setTrashedProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purgeTarget, setPurgeTarget] = useState<string | null>(null);
  const [isConfirmingEmpty, setIsConfirmingEmpty] = useState(false);
  const [purgingId, setPurgingId] = useState<string | null>(null);

  useEffect(() => {
    loadTrash();
  }, []);

  async function loadTrash() {
    try {
      const projects = await invoke<any[]>('get_trashed_projects');
      setTrashedProjects(projects.map(mapRawProject));
    } catch (err) {
      console.error('Failed to load trash:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Handlers
  const handleRestore = async (id: string) => {
    await invoke('restore_project', { id });
    setTrashedProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;

    setPurgingId(purgeTarget);
    setPurgeTarget(null);

    setTimeout(async () => {
      try {
        await invoke('purge_project', { id: purgingId || purgeTarget });
        setTrashedProjects((prev) =>
          prev.filter((p) => p.id !== (purgingId || purgeTarget))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setPurgingId(null);
      }
    }, 300);
  };

  const handleEmptyTrash = async () => {
    try {
      await invoke('empty_trash');
      setTrashedProjects([]);
      setIsConfirmingEmpty(false);
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  };

  if (isLoading)
    return (
      <div className="p-12 text-center text-slate-500">
        Searching the scrap heaps...
      </div>
    );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-12">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-center">
        <div>
          <button
            onClick={onBack}
            className="text-[#9333ea] font-bold text-sm mb-2 hover:underline cursor-pointer"
          >
            ← Back to Library
          </button>
          <h1 className="text-4xl font-bold text-slate-800">
            Project <span className="text-slate-400">Trash</span>
          </h1>
        </div>

        {trashedProjects.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setIsConfirmingEmpty(true)}
            className="text-red-500 hover:bg-red-50"
          >
            Empty Trash
          </Button>
        )}
      </header>

      <main className="max-w-6xl mx-auto">
        {trashedProjects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
            <p className="text-slate-400">
              The trash is empty. No ghosts here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {trashedProjects.map((project) => (
              <div
                key={project.id}
                className={`
                    bg-white p-6 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm
                    transition-all duration-300 transform
                    ${purgingId === project.id ? 'opacity-0 scale-95 -translate-y-4' : 'opacity-100 scale-100'}
                `}
              >
                <div>
                  <h3 className="font-bold text-slate-800">{project.name}</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">
                    {project.type}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRestore(project.id)}
                    className="px-4 py-2 text-sm font-bold text-[#9333ea] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => setPurgeTarget(project.id)}
                    className="px-4 py-2 text-sm font-bold text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={!!purgeTarget}
        title="Burn Forever?"
        message="This action is irreversible. This story will be deleted from the database entirely."
        confirmLabel="Purge Project"
        variant="danger"
        onConfirm={handlePurge}
        onCancel={() => setPurgeTarget(null)}
      />

      <ConfirmModal
        isOpen={isConfirmingEmpty}
        title="Purge All Stories?"
        message="This will permanently delete every project currently in the trash. This cannot be undone."
        confirmLabel="Empty Trash"
        variant="danger"
        onConfirm={handleEmptyTrash}
        onCancel={() => setIsConfirmingEmpty(false)}
      />
    </div>
  );
}
