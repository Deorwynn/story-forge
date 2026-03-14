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
    if (!isInitialLoad && activeProject?.id && currentBookId && activeTab) {
      invoke('set_user_preference', {
        project_id: activeProject.id,
        key: `active_tab_book_${currentBookId}`,
        value: activeTab,
      }).catch((err) => console.error('Failed to save tab pref:', err));
    }
  }, [activeTab, isInitialLoad]);

  // Persist Project selection to LocalStorage
  useEffect(() => {
    if (activeProject) {
      localStorage.setItem(
        'last_active_project',
        JSON.stringify(activeProject)
      );
    } else {
      localStorage.removeItem('last_active_project');
    }
  }, [activeProject]);

  useEffect(() => {
    const syncProjectWithDb = async () => {
      if (!activeProject?.id) return;

      setIsInitialLoad(true);

      try {
        // Fetch Project Data
        const rawData = await invoke<any>('get_project_by_id', {
          id: activeProject.id,
        });

        const savedBookId = await invoke<string>('get_last_active_book', {
          project_id: activeProject.id,
        }).catch(() => null);

        const rawBooks = rawData.books || [];
        const bookIdForTabLookup = savedBookId || rawBooks[0]?.id;

        // Fetch Tab Truth
        let initialTab: ForgeView = 'Write';
        if (bookIdForTabLookup) {
          const savedTab = await invoke<string>('get_user_preference', {
            project_id: activeProject.id,
            key: `active_tab_book_${bookIdForTabLookup}`,
          }).catch(() => null);
          if (savedTab) initialTab = savedTab as ForgeView;
        }

        // Process Project Object
        const sanitizedBooks = rawBooks.map((b: any) => ({
          ...b,
          orderIndex:
            b.orderIndex !== undefined ? b.orderIndex : (b.order_index ?? 0),
        }));

        let targetVolume = 1;
        let currentBookTitle = rawData.name;

        if (savedBookId && sanitizedBooks.length > 0) {
          const bookIndex = sanitizedBooks.findIndex(
            (b: any) => b.id === savedBookId
          );
          if (bookIndex !== -1) {
            targetVolume = bookIndex + 1;
            currentBookTitle = sanitizedBooks[bookIndex].title;
          }
        }

        // ATOMIC UPDATE: Set everything, then unlock
        setActiveTab(initialTab);
        setActiveProject({
          ...rawData,
          id: rawData.id,
          name: currentBookTitle,
          books: sanitizedBooks,
          volumeNumber: targetVolume,
          genres: Array.isArray(rawData.genres) ? rawData.genres : [],
          pov: rawData.pov || 'First Person',
        });
      } catch (err) {
        console.error('Sync failed:', err);
      } finally {
        setTimeout(() => setIsInitialLoad(false), 300);
      }
    };

    syncProjectWithDb();
  }, [activeProject?.id]);

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

  useEffect(() => {
    setDocuments([]);
    if (activeProject?.id) fetchDocs();
  }, [activeProject?.id, activeProject?.volumeNumber]);

  if (!activeProject) {
    return (
      <div className="app-container">
        {view === 'library' ? (
          <ProjectLibrary
            onCreateProject={(p) => setActiveProject(p)}
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

    // Update Local UI State
    setActiveProject({
      ...activeProject,
      name: book.title,
      volumeNumber: (book.orderIndex ?? book.order_index ?? 0) + 1,
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
