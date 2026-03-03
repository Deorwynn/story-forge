import { useState } from 'react';
import NewProjectForm from '../components/projects/NewProjectForm';
import { Project } from '../types/project';

export default function HomeView({
  onCreateProject,
}: {
  onCreateProject: (p: Project) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="h-screen w-full bg-[#0f0f12] flex flex-col items-center justify-center text-center p-6">
      <div className="mb-12">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl rotate-12 mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-500/40">
          <span className="text-4xl text-white -rotate-12 font-serif font-bold">
            S
          </span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tight mb-3">
          StoryForge
        </h1>
        <p className="text-slate-500 text-lg max-w-sm mx-auto font-medium">
          Your characters are waiting. Give them a world to live in.
        </p>
      </div>

      <button
        onClick={() => setIsCreating(true)}
        className="group relative px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform cursor-pointer"
      >
        Start a New Journey
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
