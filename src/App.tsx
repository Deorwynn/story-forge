import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Project } from './types/project';
import { ManuscriptDoc } from './types/document';
import { ForgeView, VIEW_COMPONENTS } from './navigation/Router';
import { WorkspaceProvider } from './context/WorkspaceContext';
import './App.css';

import TopNav from './components/layout/TopNav';
import TrashView from './components/home/TrashView';
import ProjectLibrary from './components/home/ProjectLibrary';
import Sidebar from './components/layout/Sidebar';

function App() {
  const [character, setCharacter] = useState({ id: 'char_001', name: '' });
  const [status, setStatus] = useState('Waiting for input...');
  const [view, setView] = useState<'library' | 'trash'>('library');
  const [documents, setDocuments] = useState<ManuscriptDoc[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Hydrate Project State
  const [activeProject, setActiveProject] = useState<Project | null>(() => {
    const saved = localStorage.getItem('last_active_project');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Hydrate Tab State
  const [activeTab, setActiveTab] = useState<ForgeView | null>(null);

  // Persist Tab to DB when it changes
  useEffect(() => {
    const currentBookId =
      activeProject?.books?.[activeProject.volumeNumber - 1]?.id;

    // The Guard: Only save if we are NOT loading AND we have a real tab selection
    if (
      !isInitialLoad &&
      activeProject?.id &&
      currentBookId &&
      activeTab !== null
    ) {
      invoke('set_user_preference', {
        project_id: activeProject.id,
        key: `active_tab_book_${currentBookId}`,
        value: activeTab,
      }).catch((err) => console.error('Failed to save tab pref:', err));
    }
  }, [activeTab, isInitialLoad, activeProject?.id]);

  // Persist Project selection to LocalStorage
  useEffect(() => {
    // Only save if we are NOT in the middle of a sync/initial load
    if (activeProject && !isInitialLoad) {
      const currentBook = activeProject.books?.[activeProject.volumeNumber - 1];

      // Determine the display name:
      // If standalone, ALWAYS use the project name.
      // If series, use the book title.
      const displayName =
        activeProject.type === 'standalone'
          ? activeProject.name
          : currentBook
            ? currentBook.title
            : activeProject.name;

      const persistentData = {
        ...activeProject,
        name: displayName,
      };

      localStorage.setItem(
        'last_active_project',
        JSON.stringify(persistentData)
      );
    }
  }, [activeProject, isInitialLoad]);

  useEffect(() => {
    const syncProjectWithDb = async () => {
      if (!activeProject?.id) return;
      if (!isInitialLoad) return;

      try {
        const rawData = await invoke<any>('get_project_by_id', {
          id: activeProject.id,
        });
        const savedBookId = await invoke<string>('get_last_active_book', {
          project_id: activeProject.id,
        });

        const sanitizedBooks = (rawData.books || []).map((b: any) => ({
          ...b,
          orderIndex: b.orderIndex ?? b.order_index ?? 0,
        }));

        // Find what the DB thinks is the last book
        let dbTargetVolume = 1;
        if (savedBookId) {
          const idx = sanitizedBooks.findIndex(
            (b: any) => b.id === savedBookId
          );
          if (idx !== -1) dbTargetVolume = idx + 1;
        }

        const savedData = localStorage.getItem('last_active_project');
        const parsedSaved = savedData ? JSON.parse(savedData) : null;
        const isSameProject = parsedSaved?.id === activeProject.id;
        const volumeFromStorage = isSameProject ? parsedSaved.volumeNumber : 0;

        let finalVolume = 1;
        if (volumeFromStorage > 0) {
          finalVolume = volumeFromStorage;
        } else if (dbTargetVolume > 0) {
          finalVolume = dbTargetVolume;
        }

        // Resolve the specific Book ID to fetch the tab
        const activeBookId = sanitizedBooks[finalVolume - 1]?.id;

        if (activeBookId) {
          const savedTab = await invoke<string>('get_user_preference', {
            project_id: activeProject.id,
            key: `active_tab_book_${activeBookId}`,
          }).catch(() => null);

          if (savedTab) {
            setActiveTab(savedTab as ForgeView);
          }
        }

        setActiveProject({
          ...rawData,
          books: sanitizedBooks,
          volumeNumber: finalVolume,
          name:
            rawData.project_type === 'standalone'
              ? rawData.name
              : sanitizedBooks[finalVolume - 1]?.title || rawData.name,
        });
      } catch (err) {
        console.error('Sync failed:', err);
      } finally {
        setIsInitialLoad(false);
      }
    };

    syncProjectWithDb();
  }, [activeProject?.id]); // Only runs when entering a project

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (character.name.length > 0) {
        try {
          setStatus('Saving...');
          await invoke('save_character_to_disk', {
            id: character.id,
            jsonData: JSON.stringify(character),
          });
          setStatus('Saved to local device!');
        } catch (error) {
          console.error('Save failed:', error);
          setStatus('Error saving!');
        }
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [character]);

  const fetchDocs = async () => {
    if (!activeProject) return;

    const currentBookId =
      activeProject.books?.[activeProject.volumeNumber - 1]?.id;

    if (currentBookId) {
      // Clear old docs
      setDocuments([]);
      setIsLoadingDocs(true);

      try {
        const result = await invoke<ManuscriptDoc[]>('get_book_documents', {
          bookId: currentBookId,
        });
        setDocuments(result);
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    }
  };

  const handleEnterProject = async (baseProject: Project) => {
    setIsInitialLoad(true); // Show the curtain immediately

    try {
      // Ask the DB: "Where did we leave off?"
      const savedBookId = await invoke<string>('get_last_active_book', {
        project_id: baseProject.id,
      }).catch(() => null);

      // Map the books
      const sanitizedBooks = (baseProject.books || []).map((b: any) => ({
        ...b,
        orderIndex: b.orderIndex ?? b.order_index ?? 0,
      }));

      let targetVolume = 1;
      let targetBookId = sanitizedBooks[0]?.id; // Default to first book

      if (savedBookId) {
        const idx = sanitizedBooks.findIndex((b: any) => b.id === savedBookId);
        if (idx !== -1) {
          targetVolume = idx + 1;
          targetBookId = savedBookId;
        }
      }

      // Fetch the tab preference for the specific book we are entering
      if (targetBookId) {
        const savedTab = await invoke<string>('get_user_preference', {
          project_id: baseProject.id,
          key: `active_tab_book_${targetBookId}`,
        }).catch(() => null);

        if (savedTab) {
          setActiveTab(savedTab as ForgeView);
        } else {
          setActiveTab('Write'); // Default if none found
        }
      }

      setActiveProject({
        ...baseProject,
        books: sanitizedBooks,
        volumeNumber: targetVolume,
        name: sanitizedBooks[targetVolume - 1]?.title || baseProject.name,
      });
    } catch (err) {
      console.error('Entry failed', err);
      setActiveProject(baseProject); // Fallback
    } finally {
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    setDocuments([]);
    if (activeProject?.id) fetchDocs();
  }, [activeProject?.id, activeProject?.volumeNumber]);

  const handleUpdateProject = (updated: Project) => {
    if (activeProject?.id === updated.id) {
      setActiveProject({
        ...updated,
        // Keep the volume number we were already on,
        // otherwise it might reset to 1 or become undefined!
        volumeNumber: activeProject.volumeNumber,
      });
    }
  };

  if (!activeProject) {
    return (
      <div className="app-container">
        {view === 'library' ? (
          <ProjectLibrary
            onCreateProject={handleEnterProject}
            onUpdateProject={handleUpdateProject}
            onViewTrash={() => setView('trash')}
          />
        ) : (
          <TrashView onBack={() => setView('library')} />
        )}
      </div>
    );
  }

  const handleBookSwitch = async (book: any) => {
    if (!activeProject) return;

    // Block the Save effect from firing during the switch
    setIsInitialLoad(true);

    const newVol = (book.orderIndex ?? book.order_index ?? 0) + 1;

    // Update Local UI State
    setActiveProject({
      ...activeProject,
      name: book.title,
      volumeNumber: newVol,
    });

    try {
      // Persist the book choice
      await invoke('set_last_active_book', {
        project_id: activeProject.id,
        book_id: book.id,
      });

      // Fetch this book's specific tab
      const savedTab = await invoke<string>('get_user_preference', {
        project_id: activeProject.id,
        key: `active_tab_book_${book.id}`,
      }).catch(() => null);

      if (savedTab) {
        setActiveTab(savedTab as ForgeView);
      } else {
        setActiveTab('Write');
      }
    } catch (err) {
      console.error('Switch failed:', err);
    } finally {
      // Allow saving again after a tiny delay to ensure state has settled
      setTimeout(() => setIsInitialLoad(false), 100);
    }
  };

  const currentTabName = activeTab ?? 'Write';
  const CurrentView = VIEW_COMPONENTS[currentTabName];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav
        onExit={() => {
          setActiveProject(null);
          setActiveTab(null);
          setView('library');
        }}
        project={activeProject}
        activeTab={currentTabName}
        onTabChange={(tab) => setActiveTab(tab as ForgeView)}
        onBookSwitch={handleBookSwitch}
      />
      <WorkspaceProvider
        value={{
          project: activeProject,
          character,
          status,
          documents,
          isLoadingDocs,
          updateCharacter: (name: string) =>
            setCharacter({ ...character, name }),
          refreshDocuments: fetchDocs,
        }}
      >
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activeTab={currentTabName} />
          <main className="flex-1 overflow-y-auto bg-white">
            {isLoadingDocs ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-[#9333ea] rounded-full animate-spin"></div>
                  <p className="text-slate-400 font-serif italic text-sm">
                    Opening Manuscript...
                  </p>
                </div>
              </div>
            ) : (
              <CurrentView />
            )}
          </main>
        </div>
      </WorkspaceProvider>
    </div>
  );
}

export default App;
