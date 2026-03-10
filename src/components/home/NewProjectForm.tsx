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
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [type, setType] = useState<'standalone' | 'series'>('standalone');
  const [genre, setGenre] = useState('Fantasy');
  const [description, setDescription] = useState('');

  // SERIES SPECIFIC
  const [seriesTitle, setSeriesTitle] = useState('');
  const [bookCount, setBookCount] = useState(3);
  const [bookTitles, setBookTitles] = useState<string[]>([]);

  const handleNextStep = () => {
    if (!inputValue.trim()) return; // Don't allow empty titles
    setSeriesTitle(inputValue);

    // Pre-fill the first book with the same name as a starting point
    const initialTitles = Array.from({ length: bookCount }, (_, i) =>
      i === 0 ? inputValue : `Volume ${i + 1}`
    );
    setBookTitles(initialTitles);
    setStep(2);
  };

  const handleCountChange = (count: number) => {
    const val = Math.min(Math.max(count, 2), 20);
    setBookCount(val);
    setBookTitles((prev) =>
      Array.from({ length: val }, (_, i) => prev[i] || `Volume ${i + 1}`)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && type === 'series') {
      handleNextStep();
      return;
    }

    setIsSaving(true);
    const projectId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const finalBookName =
      type === 'series' ? bookTitles[0] || 'Untitled Volume' : inputValue;
    const finalSeriesName = type === 'series' ? seriesTitle : '';

    try {
      // Create the Project
      await invoke('create_project', {
        id: projectId,
        name: finalBookName,
        seriesName: finalSeriesName,
        volumeNumber: 1,
        projectType: type,
        bookCount: type === 'series' ? bookCount : 1,
        genre,
        description,
      });

      const generatedBooks: any[] = [];

      // Create the Books for Rust
      if (type === 'standalone') {
        const bId = crypto.randomUUID();
        await invoke('create_book', {
          id: bId,
          projectId: projectId,
          title: finalBookName,
          orderIndex: 0,
        });
        generatedBooks.push({ id: bId, title: finalBookName, orderIndex: 0 });
      } else {
        for (let i = 0; i < bookTitles.length; i++) {
          const bId = crypto.randomUUID();
          const title = bookTitles[i] || `Volume ${i + 1}`;
          await invoke('create_book', {
            id: bId,
            projectId: projectId,
            title: title,
            orderIndex: i,
          });
          generatedBooks.push({ id: bId, title, orderIndex: i });
        }
      }

      onConfirm({
        id: projectId,
        name: finalBookName,
        seriesName: finalSeriesName,
        volumeNumber: 1,
        type: type,
        volumes: type === 'series' ? bookCount : 1,
        createdAt: now,
        updatedAt: now,
        genre,
        description,
        books: generatedBooks,
      } as any);
    } catch (error) {
      console.error('FORGE ERROR:', error);
      alert(`Failed to create project: ${error}`);
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
        <h2 className="text-3xl font-bold mb-8 italic">
          {step === 1 ? 'Forge a New ' : 'Define Your '}
          <span className="text-[#9333ea]">
            {step === 1 ? 'Story' : 'Series'}
          </span>
        </h2>

        <div className="space-y-8">
          {step === 1 ? (
            <>
              {/* TITLE INPUT */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  {type === 'standalone'
                    ? 'Project Name (Book Title)'
                    : 'Project Name (Series Title)'}
                </label>
                <input
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#9333ea] focus:bg-white outline-none transition-all placeholder:text-slate-300"
                  placeholder={
                    type === 'standalone'
                      ? 'e.g. The Last Archivist'
                      : 'e.g. The Dryad Chronicles'
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  required
                />
              </div>

              {/* LOGLINE / DESCRIPTION */}
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

              {/* STRUCTURE TOGGLE */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Structure
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {(['standalone', 'series'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer font-bold capitalize 
              ${
                type === t
                  ? 'bg-[#f3e8ff] border-[#9333ea] text-[#9333ea]'
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* GENRE GRID */}
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
                  Series Name
                </label>
                <input
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 text-slate-500 cursor-not-allowed"
                  value={seriesTitle}
                  disabled
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Volume 1 Title (The book you're starting now)
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:border-[#9333ea]"
                  placeholder="e.g. Whispers in the Mist"
                  value={bookTitles[0]}
                  onChange={(e) => {
                    const t = [...bookTitles];
                    t[0] = e.target.value;
                    setBookTitles(t);
                  }}
                  required
                />
              </div>

              {/* COUNT AND LIST LOGIC */}
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

              <div className="max-h-48 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {bookTitles.map((title, i) =>
                  i === 0 ? null : (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-300 w-8">
                        VOL {i + 1}
                      </span>
                      <input
                        placeholder={`Volume ${i + 1} Title`}
                        value={title}
                        onChange={(e) => {
                          const newTitles = [...bookTitles];
                          newTitles[i] = e.target.value;
                          setBookTitles(newTitles);
                        }}
                        className="flex-1 bg-white border border-slate-100 rounded-xl p-3 text-sm text-slate-700 focus:border-[#9333ea] outline-none shadow-sm"
                      />
                    </div>
                  )
                )}
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
