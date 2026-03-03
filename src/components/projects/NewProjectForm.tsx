import { useState } from 'react';
import { Project } from '../../types/project';
import { invoke } from '@tauri-apps/api/core';

export default function NewProjectForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (p: Project) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'standalone' | 'series'>('standalone');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: name || 'Untitled Story',
      type: type,
      expectedBookCount: type === 'series' ? 3 : 1,
      createdAt: Date.now(),
      lastOpened: Date.now(),
    };

    try {
      await invoke('create_project', {
        id: newProject.id,
        name: newProject.name,
        projectType: newProject.type,
        bookCount: newProject.expectedBookCount,
      });

      onConfirm(newProject);
    } catch (error) {
      console.error('Database error:', error);
      alert('Failed to save project to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1a1e] border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl text-white"
      >
        <h2 className="text-2xl font-bold mb-6 italic text-[#d8b4fe]">
          Forge a New Story
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Project Name
            </label>
            <input
              autoFocus
              className="w-full bg-[#0f0f12] border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. The Last Archivist"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Structure
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType('standalone')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${type === 'standalone' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-[#0f0f12] border-slate-700 text-slate-400'}`}
              >
                Standalone
              </button>
              <button
                type="button"
                onClick={() => setType('series')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${type === 'series' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-[#0f0f12] border-slate-700 text-slate-400'}`}
              >
                Series
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-3 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-[#9333ea] hover:bg-[#a855f7] text-white font-bold py-3 rounded-xl shadow-lg disabled:bg-slate-700 cursor-pointer"
          >
            {isSaving ? 'Forging...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
