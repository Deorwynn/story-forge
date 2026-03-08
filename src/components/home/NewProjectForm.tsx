import { useState } from 'react';
import { Project } from '../../types/project';
import { invoke } from '@tauri-apps/api/core';
import Button from '../shared/Button';

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
  const [description, setDescription] = useState('');

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
    const now = Math.floor(Date.now() / 1000);

    try {
      await invoke('create_project', {
        id: projectId,
        name: name || 'Untitled Story',
        projectType: type,
        bookCount: type === 'series' ? bookCount : 1,
        genre,
        description: description,
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
        volumes: type === 'series' ? bookCount : 1,
        createdAt: now,
        updatedAt: now,
        lastOpened: now,
        genre: genre,
        description: description || '',
      });
    } catch (error) {
      console.error('Database error:', error);
      alert('Failed to save project to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl text-slate-800"
      >
        <h2 className="text-3xl font-bold mb-8 italic text-slate-800 tracking-tight">
          {step === 1 ? 'Forge a New ' : 'Define Your '}
          <span className="text-[#9333ea]">
            {step === 1 ? 'Story' : 'Series'}
          </span>
        </h2>

        <div className="space-y-8">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Project Name
                </label>
                <input
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#9333ea] focus:bg-white outline-none transition-all placeholder:text-slate-300"
                  placeholder="e.g. The Last Archivist"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Brief Logline (Optional)
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#9333ea] focus:bg-white outline-none transition-all placeholder:text-slate-300 text-sm resize-none"
                  placeholder="A brief sentence about your story..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Structure
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setType('standalone')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer font-bold ${type === 'standalone' ? 'bg-[#f3e8ff] border-[#9333ea] text-[#9333ea]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    Standalone
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('series')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer font-bold ${type === 'series' ? 'bg-[#f3e8ff] border-[#9333ea] text-[#9333ea]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    Series
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Genre
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Fantasy', icon: '🔮' },
                    { label: 'Sci-Fi', icon: '🚀' },
                    { label: 'Romance', icon: '💖' },
                    { label: 'Mystery', icon: '🔍' },
                    { label: 'Horror', icon: '👻' },
                    { label: 'Thriller', icon: '🔪' },
                    { label: 'YA', icon: '🎒' },
                    { label: 'Children', icon: '🧸' },
                    { label: 'Other', icon: '📝' },
                  ].map((g) => (
                    <button
                      key={g.label}
                      type="button"
                      onClick={() => setGenre(g.label)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer
                      ${
                        genre === g.label
                          ? 'bg-[#f3e8ff] border-[#9333ea] text-[#9333ea]'
                          : 'bg-slate-50 border-transparent text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <span className="text-xl mb-1">{g.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-tight">
                        {g.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:border-[#9333ea]"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
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
                    className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm text-slate-700 focus:border-[#9333ea] outline-none shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex gap-4">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={step === 2 ? () => setStep(1) : onCancel}
            disabled={isSaving}
          >
            {step === 2 ? 'Back' : 'Cancel'}
          </Button>

          <Button type="submit" className="flex-[2]" isLoading={isSaving}>
            {type === 'series' && step === 1 ? 'Next Step' : 'Create Project'}
          </Button>
        </div>
      </form>
    </div>
  );
}
