import { useState } from 'react';
import { Project } from '../../types/project';

export default function NewProjectForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (p: Project) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'standalone' | 'series'>('standalone');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      id: crypto.randomUUID(),
      name: name || 'Untitled Story',
      type: type,
      expectedBookCount: type === 'series' ? 3 : 1,
      createdAt: Date.now(),
      lastOpened: Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1a1e] border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-white mb-6">
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
            className="flex-1 px-4 py-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 cursor-pointer"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
