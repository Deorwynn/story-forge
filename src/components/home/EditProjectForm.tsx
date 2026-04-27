import { useState } from 'react';
import { Project } from '../../types/project';
import {
  Rocket,
  Heart,
  Backpack,
  WandSparkles,
  Ghost,
  HatGlasses,
  NotebookPen,
  Flower2,
  Swords,
  Tent,
  Building2,
  Fingerprint,
  Trash2,
} from 'lucide-react';
import ModalShell from '../shared/ModalShell';
import Button from '../shared/Button';
import VolumeManager from './VolumeManager';
import ConfirmModal from '../shared/ConfirmModal';
import GenreSelector from './GenreSelector';
import ImageUpload from '../shared/ImageUpload';
import { invoke } from '@tauri-apps/api/core';

export const GENRES = [
  { label: 'Fantasy', icon: <WandSparkles size={20} /> },
  { label: 'Sci-Fi', icon: <Rocket size={20} /> },
  { label: 'Romance', icon: <Heart size={20} /> },
  { label: 'Mystery', icon: <HatGlasses size={20} /> },
  { label: 'Horror', icon: <Ghost size={20} /> },
  { label: 'Thriller', icon: <Fingerprint size={20} /> },
  { label: 'Dystopian', icon: <Building2 size={20} /> },
  { label: 'Historical', icon: <Swords size={20} /> },
  { label: 'Western', icon: <Tent size={20} /> },
  { label: 'YA', icon: <Backpack size={20} /> },
  { label: 'Children', icon: <Flower2 size={20} /> },
  { label: 'Other', icon: <NotebookPen size={20} /> },
];

type Tab = 'general' | 'series' | 'danger';

export default function EditProjectForm({
  project,
  onConfirm,
  onCancel,
}: {
  project: Project;
  onConfirm: (updated: Project) => void;
  onCancel: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [subView, setSubView] = useState<'genres' | null>(null);

  // Form State
  const [type, setType] = useState(project.type);
  const [name, setName] = useState(
    project.type === 'series' ? project.seriesName || '' : project.name
  );
  const [description, setDescription] = useState(project.description || '');
  const [pov, setPov] = useState(project.pov || 'First Person');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    Array.isArray(project.genres) ? project.genres : []
  );
  const [coverPath, setCoverPath] = useState<string | null>(
    project.coverPath || null
  );
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [imageWasUploaded, setImageWasUploaded] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);

  const [bookTitles, setBookTitles] = useState<string[]>(
    project.books?.map((b) => b.title) || [project.name]
  );

  const [modalError, setModalError] = useState<string | null>(null);
  const [currentBooks, setCurrentBooks] = useState(project.books || []);

  // Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
    target: 'book' | 'project';
    isLastTwo?: boolean;
  } | null>(null);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isFormValid = name.trim() !== '' && selectedGenres.length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isStandalone = type === 'standalone';
      const now = Math.floor(Date.now() / 1000);

      // Get the correct Book ID
      const survivingBook = currentBooks[0] || project.books[0];

      const updatedPayload = {
        ...project,
        name: isStandalone ? name : project.name,
        series_name: isStandalone ? '' : name,
        project_type: type,
        volume_number: 1, // Reset to 1 for standalone
        book_count: isStandalone ? 1 : bookTitles.length,
        genres: selectedGenres,
        pov: pov,
        description: description,
        cover_path: coverPath || null,
      };

      // Update the main Project record
      await invoke('update_project', updatedPayload);

      const updatedBooksForState: any[] = [];

      if (isStandalone) {
        // Sync the one book's title to match the project name
        await invoke('update_book_title', {
          id: survivingBook.id,
          title: name,
        });

        // Make all characters global so they don't stay linked to deleted books
        await invoke('globalize_project_characters', {
          projectId: project.id,
        });

        // Update the state we send back to App.tsx
        updatedBooksForState.push({
          ...survivingBook,
          title: name,
          orderIndex: 0,
        });
      } else {
        // Handle Series Sync: Update or Create all volumes in the list
        for (let i = 0; i < bookTitles.length; i++) {
          const existingBook = currentBooks[i] || project.books?.[i];
          const title = bookTitles[i];

          if (existingBook) {
            await invoke('update_book_title', { id: existingBook.id, title });
            updatedBooksForState.push({
              ...existingBook,
              title,
              orderIndex: i,
            });
          } else {
            const newBookId = crypto.randomUUID();
            await invoke('create_book', {
              id: newBookId,
              project_id: project.id,
              title: title || `Volume ${i + 1}`,
              order_index: i,
            });
            updatedBooksForState.push({ id: newBookId, title, orderIndex: i });
          }
        }
      }

      // Send the perfectly aligned state back to App.tsx
      const finalProjectState = {
        ...project,
        ...updatedPayload,
        seriesName: updatedPayload.series_name,
        id: project.id,
        type: type,
        books: updatedBooksForState,
        bookCount: updatedBooksForState.length,
        volumeNumber: isStandalone ? 1 : project.volumeNumber,
        genres: selectedGenres,
        pov: pov,
        description: description,
        coverPath: coverPath,
        // If standalone, name is the input. If series, name is the specific volume's title.
        name: isStandalone
          ? name
          : updatedBooksForState[project.volumeNumber - 1]?.title || name,
        createdAt: project.createdAt,
        updatedAt: now,
      };

      onConfirm(finalProjectState as Project);
      onCancel();
    } catch (err) {
      console.error('Failed to save project:', err);
      setModalError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const executeVolumeDelete = async () => {
    if (!deleteConfirm) return;
    setIsSaving(true);
    setModalError(null);

    try {
      if (deleteConfirm.target === 'book') {
        await invoke('delete_book', {
          id: deleteConfirm.id,
          project_id: project.id,
        });

        const sourceList =
          currentBooks.length > 0 ? currentBooks : project.books || [];

        const updatedBooks = sourceList.filter(
          (b) => b.id !== deleteConfirm.id
        );
        const newCount = updatedBooks.length;

        // Update local state immediately so the UI lists change
        setCurrentBooks(updatedBooks);
        setBookTitles(updatedBooks.map((b) => b.title));

        if (newCount === 1) {
          const remainingBook = updatedBooks[0];
          // Use the name from the input field as the master title
          const masterTitle = name;

          // Make all characters global so they don't stay linked to deleted books
          await invoke('globalize_project_characters', {
            projectId: project.id,
          });

          const updatePayload = {
            id: project.id,
            name: masterTitle,
            project_type: 'standalone',
            series_name: '',
            genres: selectedGenres,
            pov,
            description,
            book_count: 1,
            volume_number: 1,
            coverPath,
          };

          await invoke('update_project', updatePayload);

          if (remainingBook) {
            await invoke('update_book_title', {
              id: remainingBook.id,
              title: masterTitle,
            });
          }

          // Update local state
          const finalizedBooks = [
            { ...remainingBook, title: masterTitle, orderIndex: 0 },
          ];

          setType('standalone');
          setName(masterTitle);
          setBookTitles([masterTitle]);

          onConfirm({
            ...project,
            ...updatePayload,
            seriesName: '',
            type: 'standalone',
            name: masterTitle,
            books: finalizedBooks,
            bookCount: 1,
          } as Project);
        } else {
          onConfirm({
            ...project,
            books: updatedBooks,
            bookCount: newCount,
          } as Project);
        }
      } else {
        await invoke('delete_project', { id: project.id });
        onConfirm({ ...project, id: 'DELETED' } as any);
        onCancel();
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      setModalError(
        err.message || err.toString() || 'Database rejected the request.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Logic to determine if any field has changed
  const isDirty =
    type !== project.type ||
    name !==
      (project.type === 'series' ? project.seriesName || '' : project.name) ||
    description !== (project.description || '') ||
    pov !== (project.pov || 'First Person') ||
    JSON.stringify(selectedGenres) !== JSON.stringify(project.genres || []) ||
    JSON.stringify(bookTitles) !==
      JSON.stringify(project.books?.map((b) => b.title) || []) ||
    coverPath !== (project.coverPath || null) ||
    imageWasUploaded;

  // Intercept the close request
  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onCancel();
    }
  };

  return (
    <>
      <ModalShell
        title="Project Settings"
        onClose={handleCloseAttempt}
        maxWidth="max-w-3xl"
      >
        <div className="flex gap-8 min-h-[450px]">
          {/* LEFT NAV */}
          <div className="w-44 flex flex-col gap-2 border-r border-slate-100 pr-4">
            {(['general', 'series', 'danger'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setActiveTab(t);
                  setSubView(null);
                }}
                className={`relative text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all group cursor-pointer
                  ${
                    activeTab === t
                      ? t === 'danger'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-purple-50 text-[#9333ea]'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <div
                  className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full transition-all duration-300
                  ${t === 'danger' ? 'bg-red-500' : 'bg-[#9333ea]'}
                  ${activeTab === t ? 'h-1/2 opacity-100' : 'h-0 opacity-0 group-hover:h-1/2 group-hover:opacity-100'}`}
                />
                {t}
              </button>
            ))}
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {activeTab === 'general' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {!subView ? (
                  <div className="space-y-8">
                    {/* COVER SECTION */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Project Cover
                      </label>
                      <ImageUpload
                        key={previewKey}
                        collection="projects"
                        entityId={project.id}
                        currentPath={coverPath}
                        version={previewKey}
                        onUploadSuccess={async (newPath: string) => {
                          // If the user already uploaded something else this session, delete the old "temporary" file
                          if (
                            uploadedPath &&
                            uploadedPath !== project.coverPath
                          ) {
                            await invoke('delete_image_file', {
                              path: uploadedPath,
                            });
                          }

                          setCoverPath(newPath);
                          setUploadedPath(newPath);
                          setImageWasUploaded(true);
                          setPreviewKey(Date.now());
                        }}
                      />
                    </div>

                    {/* TITLE SECTION */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        {type === 'series' ? 'Series Title' : 'Book Title'}
                      </label>
                      <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-lg font-bold outline-none focus:border-[#9333ea]"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    {/* GENRE PREVIEW */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Genres
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_130px] gap-4 items-center">
                        <div className="flex flex-wrap gap-2">
                          {selectedGenres.map((gLabel) => (
                            <div
                              key={gLabel}
                              className="flex items-center gap-2 bg-purple-50 text-[#9333ea] px-3 py-1.5 rounded-lg text-[11px] font-bold border border-purple-100"
                            >
                              <span className="scale-75">
                                {GENRES.find((g) => g.label === gLabel)?.icon}
                              </span>
                              {gLabel}
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="primary"
                          onClick={() => setSubView('genres')}
                        >
                          Edit Selection
                        </Button>
                      </div>
                    </div>

                    {/* POV SECTION */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Point of View
                      </label>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {[
                          'First Person',
                          'Third Limited',
                          'Omniscient',
                          'Second Person',
                        ].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPov(p)}
                            className={`py-3 px-2 rounded-xl border-2 text-[10px] font-bold uppercase tracking-tight transition-all 
                              ${pov === p ? 'border-[#9333ea] bg-purple-50 text-[#9333ea] shadow-sm' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Description
                      </label>
                      <textarea
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-[#9333ea] resize-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  /* GENRE SELECTION VIEW */
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <button
                        onClick={() => setSubView(null)}
                        className="hover:text-purple-600 font-bold text-[10px] uppercase tracking-widest"
                      >
                        General
                      </button>
                      <span className="text-xs">/</span>
                      <span className="text-slate-800 font-bold text-[10px] uppercase tracking-widest">
                        Genres
                      </span>
                    </div>
                    <h3 className="text-xl font-bold italic">
                      Select Genres
                      <span className="text-slate-400 text-xs not-italic font-normal ml-2">
                        (Up to 3)
                      </span>
                    </h3>

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

                    <Button variant="ghost" onClick={() => setSubView(null)}>
                      Back to General
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'series' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {type === 'standalone' ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-purple-50/50 rounded-[2rem] border-2 border-dashed border-purple-100">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-purple-500 mb-4">
                      <WandSparkles size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 italic">
                      Expand your universe?
                    </h3>
                    <p className="text-slate-500 text-sm mt-2 mb-8 max-w-[280px]">
                      Convert this standalone project into a series to manage
                      multiple volumes and shared world-building.
                    </p>
                    <Button
                      onClick={() => {
                        setType('series');
                        // If it was a standalone, it had 1 book (the project name).
                        // We now force it to have 2 books to qualify as a series.
                        if (bookTitles.length <= 1) {
                          setBookTitles([name, 'Volume 2']);
                        }
                      }}
                      variant="primary"
                    >
                      Convert to Series
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase text-slate-400">
                        Series Volumes
                      </h3>
                      <span className="text-xs font-bold text-purple-600">
                        {bookTitles.length} Books
                      </span>
                    </div>
                    {/* RESTORED VOLUMEMANAGER */}
                    <VolumeManager
                      titles={bookTitles}
                      onChange={setBookTitles}
                      showDelete={false}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="space-y-6">
                {/* Book Deletion List */}
                {type === 'series' &&
                  currentBooks.map((book) => (
                    <div
                      key={book.id}
                      className="flex justify-between items-center p-4 bg-white border rounded-2xl"
                    >
                      <span className="font-bold text-sm">{book.title}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirm({
                            id: book.id,
                            title: book.title,
                            target: 'book',
                            isLastTwo: currentBooks.length <= 2,
                          })
                        }
                        className="text-red-400 hover:text-red-600 p-2 cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}

                {/* Project Delete Button */}
                <div className="p-6 border-2 border-red-100 rounded-2xl bg-red-50/30">
                  <h3 className="text-red-600 font-bold text-[10px] uppercase mb-2">
                    Trash Project
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    The project and all its books will be moved to the Trash
                    bin.
                  </p>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 w-full"
                    onClick={() =>
                      setDeleteConfirm({
                        id: project.id,
                        title: name,
                        target: 'project',
                      })
                    }
                  >
                    Move Project to Trash
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-10 pt-6 border-t border-slate-50">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={handleCloseAttempt}
          >
            Cancel
          </Button>
          <Button
            className="flex-[2]"
            isLoading={isSaving}
            disabled={!isFormValid}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </ModalShell>

      {deleteConfirm && (
        <ConfirmModal
          isOpen={!!deleteConfirm}
          title={
            modalError
              ? 'Action Failed'
              : deleteConfirm.target === 'project'
                ? 'Delete Project'
                : 'Delete Volume'
          }
          message={
            modalError ||
            (deleteConfirm.target === 'project'
              ? `Are you sure you want to delete "${name}"? This will move the project and all its books to the trash.`
              : deleteConfirm.isLastTwo
                ? `Warning: Deleting this volume will leave you with only one book. This will convert "${name}" back into a Standalone project. Continue?`
                : `Are you sure you want to delete "${deleteConfirm.title}"?`)
          }
          confirmLabel={
            modalError
              ? 'OK'
              : deleteConfirm.target === 'project'
                ? 'Delete Project'
                : 'Delete Volume'
          }
          variant={modalError ? 'primary' : 'danger'}
          onConfirm={
            modalError
              ? () => {
                  setDeleteConfirm(null);
                  setModalError(null);
                }
              : executeVolumeDelete
          }
          onCancel={
            modalError
              ? undefined
              : () => {
                  setDeleteConfirm(null);
                  setModalError(null);
                }
          }
        />
      )}

      {/* DISCARD CHANGES GUARD MODAL */}
      {showDiscardConfirm && (
        <ConfirmModal
          isOpen={showDiscardConfirm}
          title="Unsaved Changes"
          message="You have modified settings for this project. If you leave now, these changes will be discarded."
          confirmLabel="Discard Changes"
          cancelLabel="Stay"
          variant="danger"
          onConfirm={async () => {
            if (
              imageWasUploaded &&
              uploadedPath &&
              uploadedPath !== project.coverPath
            ) {
              try {
                await invoke('delete_image_file', { path: uploadedPath });
              } catch (err) {
                console.error('Failed to clean up orphaned asset:', err);
              }
            }

            // 2. Reset states and close
            setCoverPath(project.coverPath || null);
            setImageWasUploaded(false);
            setUploadedPath(null);
            onCancel();
          }}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </>
  );
}
