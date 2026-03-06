import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Project } from '../../types/project';
import { mapRawProject } from '../../utils/projectMapper';
import NewProjectForm from './NewProjectForm';
import ProjectCard from './ProjectCard';
import Button from '../shared/Button';
import ConfirmModal from '../shared/ConfirmModal';

/**
 * HomeView Component
 * Acts as the primary dashboard for users to manage their story library.
 * Handles data fetching, project mapping, and the "Create Project" flow.
 */
export default function HomeView({
  onCreateProject,
  onViewTrash,
}: {
  onCreateProject: (p: Project) => void;
  onViewTrash: () => void;
}) {
  // --- State Management ---
  const [isCreating, setIsCreating] = useState(false);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // --- Data Fetching & Sync ---
  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        const projects = await invoke<any[]>('get_projects');
        const mappedProjects = projects.map(mapRawProject);

        if (isMounted) setExistingProjects(mappedProjects);
      } catch (err) {
        console.error('[HomeView] Failed to load projects:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProjects();
    return () => {
      isMounted = false;
    }; // Cleanup to prevent memory leaks
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await invoke('delete_project', { id: deleteTarget });
      setExistingProjects((prev) => prev.filter((p) => p.id !== deleteTarget));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteTarget(null); // Close modal
    }
  };

  // --- Handlers ---

  const handleEdit = (p: Project) => {
    // Logic will be implemented in future PR
    console.log(`[HomeView] Action: Edit Project ${p.name}`);
  };

  // --- Sub-Components ---
  const LoadingOverlay = () => (
    <div className="h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center text-slate-800">
      <div className="w-12 h-12 border-4 border-[#e9d5ff] border-t-[#9333ea] rounded-full animate-spin mb-4" />
      <p className="text-lg font-medium text-slate-500 animate-pulse">
        Waking the forge...
      </p>
    </div>
  );

  const EmptyState = () => (
    <div className="mb-12 w-full max-w-md text-center py-16 px-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
      <div className="w-16 h-16 bg-[#f3e8ff] rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-2xl text-[#9333ea]">✨</span>
      </div>
      <p className="text-slate-500 mb-2 font-semibold text-lg">
        Your library is empty.
      </p>
      <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">
        Time to forge something new
      </p>
    </div>
  );

  // --- Main Render Logic ---
  if (isLoading) return <LoadingOverlay />;

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center p-12">
      {/* TRASH ANCHOR */}
      <button
        onClick={onViewTrash}
        className="absolute top-8 right-8 text-slate-400 hover:text-[#9333ea] transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] group cursor-pointer"
      >
        <span className="text-sm group-hover:rotate-12 transition-transform">
          🗑
        </span>
        <span>View Trash</span>
      </button>
      {/* Header Area */}
      <header className="mb-16 text-center">
        <h1 className="text-5xl font-bold mb-4 italic text-slate-800 tracking-tight">
          Your <span className="text-[#9333ea]">Stories</span>
        </h1>
        <p className="text-slate-400 text-lg font-medium">
          Select a world to continue writing.
        </p>
      </header>

      <main className="w-full max-w-6xl flex flex-col items-center">
        {existingProjects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 w-full px-4">
            {existingProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={onCreateProject}
                onDelete={(id) => setDeleteTarget(id)}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}

        {/* Global CTA */}
        <Button onClick={() => setIsCreating(true)}>
          <span className="text-xl">+</span>
          <span>Start a New Journey</span>
        </Button>
      </main>

      {/* Modals */}
      {isCreating && (
        <NewProjectForm
          onConfirm={onCreateProject}
          onCancel={() => setIsCreating(false)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Story?"
        message="This will move your project to the trash. You can recover it later from settings."
        confirmLabel="Move to Trash"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
