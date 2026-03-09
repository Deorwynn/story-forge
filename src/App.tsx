import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Project } from './types/project';
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
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-white">
          <WorkspaceProvider
            value={{
              project: activeProject,
              character,
              status,
              updateCharacter: (name: string) =>
                setCharacter({ ...character, name }),
            }}
          >
            <CurrentView />
          </WorkspaceProvider>
        </main>
      </div>
    </div>
  );
}

export default App;
