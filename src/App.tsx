import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Project } from './types/project';
import TopNav from './components/layout/TopNav';
import './App.css';

import HomeView from './components/projects/HomeView';
import CharacterTab from './components/CharacterTab';
import Sidebar from './components/layout/Sidebar';

function App() {
  const [character, setCharacter] = useState({ id: 'char_001', name: '' });
  const [status, setStatus] = useState('Waiting for input...');
  const [activeProject, setActiveProject] = useState<Project | null>(null);

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
    return <HomeView onCreateProject={(p) => setActiveProject(p)} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-white">
          <CharacterTab
            character={character}
            onUpdate={(name) => setCharacter({ ...character, name })}
            status={status}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
