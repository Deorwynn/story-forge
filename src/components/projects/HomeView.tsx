import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import NewProjectForm from './NewProjectForm';
import { Project } from '../../types/project';

export default function HomeView({
  onCreateProject,
}: {
  onCreateProject: (p: Project) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const projects = await invoke<any[]>('get_projects');
        setExistingProjects(
          projects.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.project_type,
            expectedBookCount: p.book_count,
            createdAt: Date.now(),
            lastOpened: Date.now(),
          }))
        );
      } catch (err) {
        console.error('Failed to load projects', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#0f0f12] flex items-center justify-center text-white">
        <p className="text-xl animate-pulse">Waking the forge...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0f0f12] flex flex-col items-center justify-center p-6 text-white">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-2 italic text-[#d8b4fe]">
          Your Stories
        </h1>
        <p className="text-slate-500 text-sm">
          Select a world to continue writing.
        </p>
      </div>

      {/* Empty State Check */}
      {existingProjects.length === 0 ? (
        <div className="mb-12 text-center py-10 px-6 border-2 border-dashed border-slate-800 rounded-3xl">
          <p className="text-slate-400 mb-2 font-medium">
            Your library is empty.
          </p>
          <p className="text-slate-600 text-xs uppercase tracking-widest">
            Time to forge something new
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 w-full max-w-5xl px-4">
          {existingProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => onCreateProject(project)}
              className="group p-6 bg-[#1a1a1e] border border-slate-800 rounded-2xl hover:border-[#9333ea] hover:bg-[#232329] transition-all text-left cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#9333ea] opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-[#d8b4fe] transition-colors">
                {project.name}
              </h3>
              <p className="text-slate-400 text-sm uppercase tracking-wider font-semibold">
                {project.type}
              </p>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsCreating(true)}
        className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-[#d8b4fe] hover:scale-105 transition-all shadow-lg shadow-white/5 cursor-pointer"
      >
        + Start a New Journey
      </button>

      {isCreating && (
        <NewProjectForm
          onConfirm={onCreateProject}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  );
}
