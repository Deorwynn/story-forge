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
  const [genre, setGenre] = useState('Fantasy');
  const [step, setStep] = useState(1);
  const [bookCount, setBookCount] = useState(3);
  const [bookTitles, setBookTitles] = useState<string[]>([
    'Volume 1',
    'Volume 2',
    'Volume 3',
  ]);

  const handleCountChange = (count: number) => {
    const val = Math.min(Math.max(count, 2), 20);
    setBookCount(val);
    const titles = Array.from(
      { length: val },
      (_, i) => bookTitles[i] || `Volume ${i + 1}`
    );
    setBookTitles(titles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && type === 'series') {
      setStep(2);
      return;
    }

    setIsSaving(true);
    const projectId = crypto.randomUUID();

    try {
      await invoke('create_project', {
        id: projectId,
        name: name || 'Untitled Story',
        projectType: type,
        bookCount: type === 'series' ? bookCount : 1,
        genre,
        description: '',
      });

      if (type === 'standalone') {
        await invoke('create_book', {
          id: crypto.randomUUID(),
          projectId: projectId,
          title: name || 'Untitled Story',
          orderIndex: 0,
        });
      } else {
        for (let i = 0; i < bookTitles.length; i++) {
          await invoke('create_book', {
            id: crypto.randomUUID(),
            projectId: projectId,
            title: bookTitles[i],
            orderIndex: i,
          });
        }
      }

      onConfirm({
        id: projectId,
        name: name || 'Untitled Story',
        type: type,
        expectedBookCount: type === 'series' ? bookCount : 1,
        createdAt: Date.now(),
        lastOpened: Date.now(),
      });
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
          {step === 1 ? 'Forge a New Story' : 'Define Your Series'}
        </h2>

        <div className="space-y-6">
          {step === 1 ? (
            <>
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

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Genre
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-[#0f0f12] border border-slate-700 rounded-lg p-3 text-white focus:border-[#9333ea] outline-none cursor-pointer"
                >
                  <option value="Fantasy">Fantasy</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Romance">Romance</option>
                  <option value="Mystery">Mystery</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Non-Fiction">Non-Fiction</option>
                </select>
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Number of Books (2-20)
                </label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={bookCount}
                  onChange={(e) =>
                    handleCountChange(parseInt(e.target.value) || 2)
                  }
                  className="w-full bg-[#0f0f12] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-[#9333ea]"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {bookTitles.map((title, i) => (
                  <input
                    key={i}
                    placeholder={`Book ${i + 1} Title`}
                    value={title}
                    onChange={(e) => {
                      const newTitles = [...bookTitles];
                      newTitles[i] = e.target.value;
                      setBookTitles(newTitles);
                    }}
                    className="w-full bg-[#1a1a1e] border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:border-indigo-500 outline-none"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={step === 2 ? () => setStep(1) : onCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-3 text-slate-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            {step === 2 ? 'Back' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-[#9333ea] hover:bg-[#a855f7] text-white font-bold py-3 rounded-xl shadow-lg disabled:bg-slate-700 cursor-pointer transition-all"
          >
            {isSaving
              ? 'Forging...'
              : type === 'series' && step === 1
                ? 'Continue'
                : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
