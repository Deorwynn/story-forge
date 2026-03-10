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
  const [activeTab, setActiveTab] = useState<ForgeView>(() => {
    return (localStorage.getItem('last_active_tab') as ForgeView) || 'Write';
  });

  // Persistence Sync
  useEffect(() => {
    if (activeProject) {
      localStorage.setItem(
        'last_active_project',
        JSON.stringify(activeProject)
      );
      localStorage.setItem('last_active_tab', activeTab);
    } else {
      localStorage.removeItem('last_active_project');
    }
  }, [activeProject, activeTab]);

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

  useEffect(() => {
    // Only fetch if we actually have an active project and it has a book selected

    const fetchDocs = async () => {
      if (!activeProject) return;

      // assume for now you're tracking which book is active
      // (e.g., via activeProject.id or a separate state)
      const currentBookId =
        activeProject.books?.[activeProject.volumeNumber - 1]?.id;

      if (currentBookId) {
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

    fetchDocs();
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

  const handleBookSwitch = (book: any) => {
    if (!activeProject) return;

    setActiveProject({
      ...activeProject,
      name: book.title,
      volumeNumber: book.order_index + 1,
    });

    // Later: trigger a re-fetch of
    // 'documents' (chapters/notes) using the book.id here
  };

  const CurrentView = VIEW_COMPONENTS[activeTab];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav
        onExit={() => {
          setActiveProject(null);
          setView('library');
        }}
        project={activeProject}
        activeTab={activeTab}
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
        }}
      >
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activeTab={activeTab} />
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
