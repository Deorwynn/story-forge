import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Project } from '../../types/project';
import { mapRawProject } from '../../utils/projectMapper';
import NewProjectForm from './NewProjectForm';
import EditProjectForm from './EditProjectForm';
import EmptyState from '../shared/EmptyState';
import ProjectCard from './ProjectCard';
import Button from '../shared/Button';
import ConfirmModal from '../shared/ConfirmModal';
import AppHeader from '../layout/AppHeader';
import { TrashIcon } from '../shared/Icons';

export default function ProjectLibrary({
  onCreateProject,
  onUpdateProject,
  onViewTrash,
}: {
  onCreateProject: (p: Project) => void;
  onUpdateProject: (p: Project) => void;
  onViewTrash: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProjects() {
      try {
        const projects = await invoke<any[]>('get_projects');
        const mappedProjects = projects.map(mapRawProject);
        if (isMounted) setExistingProjects(mappedProjects);
      } catch (err) {
        console.error('[ProjectLibrary] Failed to load projects:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoke('delete_project', { id: deleteTarget });
      setExistingProjects((prev) => prev.filter((p) => p.id !== deleteTarget));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (p: Project) => {
    setEditingProject(p);
  };

  if (isLoading)
    return (
      <div className="h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#e9d5ff] border-t-[#9333ea] rounded-full animate-spin mb-4" />
        <p className="text-lg font-medium text-slate-500 animate-pulse italic">
          Waking the forge...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col font-sans">
      {/* Unified Header */}
      <AppHeader subtitle="Your Writing Library">
        <Button
          variant="outline"
          onClick={onViewTrash}
          className="h-9 px-4 text-gray-500 hover:text-red-500"
          icon={<TrashIcon className="w-4 h-4" />}
        >
          Trash
        </Button>
        <Button
          onClick={() => setIsCreating(true)}
          className="h-9 px-4 shadow-purple-200 shadow-lg"
          icon={<span className="text-xl">+</span>}
        >
          New Project
        </Button>
      </AppHeader>

      {/* Main Content Area */}
      <main className="relative flex-grow w-full flex justify-center overflow-y-auto">
        {/* THE "GLOW" */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-100/30 blur-[120px] rounded-full pointer-events-none z-0" />

        <div className="relative z-10 w-full max-w-[1400px] px-8 py-12 md:px-12 lg:px-16">
          {existingProjects.length === 0 ? (
            <EmptyState
              title="Your library is quiet."
              description="Every masterpiece starts with a single click. Forge your first world today."
              actionLabel="New Project"
              onAction={() => setIsCreating(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-16 w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
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
        </div>
      </main>

      {/* Modals */}
      {isCreating && (
        <NewProjectForm
          onConfirm={(p) => {
            setExistingProjects((prev) => [p, ...prev]);
            setIsCreating(false);
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {editingProject && (
        <EditProjectForm
          key={editingProject.id}
          project={editingProject}
          onCancel={() => setEditingProject(null)}
          onConfirm={(updated) => {
            if ((updated as any).id === 'DELETED') {
              setExistingProjects((prev) =>
                prev.filter((p) => p.id !== editingProject.id)
              );
              setEditingProject(null);
            } else {
              setExistingProjects((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p))
              );
              onUpdateProject(updated);
            }
          }}
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
