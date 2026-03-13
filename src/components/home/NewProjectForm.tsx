import { useState } from 'react';
import { Project } from '../../types/project';
import { invoke } from '@tauri-apps/api/core';
import Button from '../shared/Button';
import ModalShell from '../shared/ModalShell';
import GenreSelector from './GenreSelector';
import VolumeManager from './VolumeManager';

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
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  // SERIES SPECIFIC
  const [seriesTitle, setSeriesTitle] = useState('');
  const [bookCount, setBookCount] = useState(3);
  const [bookTitles, setBookTitles] = useState<string[]>([]);

  const isFormValid =
    inputValue.trim() !== '' &&
    selectedGenres.length > 0 &&
    (step === 1 || bookTitles.every((t) => t.trim() !== ''));

  const handleNextStep = () => {
    if (!isFormValid) return;
    if (!inputValue.trim()) return; // Don't allow empty titles
    setSeriesTitle(inputValue);

    // Pre-fill the first book with the same name as a starting point
    const initialTitles = Array.from({ length: bookCount }, (_, i) =>
      i === 0 ? inputValue : `Volume ${i + 1}`
    );
    setBookTitles(initialTitles);
    setStep(2);
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
    <ModalShell
      title={step === 1 ? 'Forge New Project' : 'Plan Series'}
      onClose={onCancel}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-8 py-4">
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
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Genre Selection
              </label>
              <GenreSelector
                selected={selectedGenres}
                onToggle={(label) => {
                  if (selectedGenres.includes(label)) {
                    setSelectedGenres((prev) =>
                      prev.filter((g) => g !== label)
                    );
                  } else if (selectedGenres.length < 3) {
                    setSelectedGenres((prev) => [...prev, label]);
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Series Roadmap
            </label>
            <VolumeManager titles={bookTitles} onChange={setBookTitles} />
          </div>
        )}

        <div className="flex gap-4 pt-6 border-t border-slate-50">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={step === 2 ? () => setStep(1) : onCancel}
          >
            {step === 2 ? 'Back' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            className="flex-[2]"
            disabled={!isFormValid}
            isLoading={isSaving}
          >
            {type === 'series' && step === 1 ? 'Next Step' : 'Create Project'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
