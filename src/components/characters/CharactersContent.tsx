import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, User, Plus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import SidebarItem from '../layout/SidebarItem';
import SegmentedControl from '../shared/SegmentedControl';
import { NewCharacterForm } from './NewCharacterForm';

type ViewMode = 'role' | 'alpha';

interface CharactersContentProps {
  projectId: string;
  activeCharacterId?: string;
  onSelectCharacter: (id: string) => void;
}

export default function CharactersContent({
  projectId,
  activeCharacterId,
  onSelectCharacter,
}: CharactersContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('role');
  const [characters, setCharacters] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Main Characters'])
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preSelectedRole, setPreSelectedRole] = useState('Main');

  const roles = ['Main Characters', 'Supporting', 'Side', 'Other'];

  const fetchCharacters = async () => {
    if (!projectId) return; // Guard clause

    try {
      const list = await invoke<any[]>('get_characters', {
        projectId: projectId,
      });
      setCharacters(list);
    } catch (err) {
      console.error('Failed to fetch:', err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchCharacters();
    }
  }, [projectId, activeCharacterId]);

  // Derive alphabet list based on actual characters existing
  const alphabet = useMemo(() => {
    const letters = characters
      .map((c) => c.display_name[0]?.toUpperCase())
      .filter(Boolean);
    return Array.from(new Set(letters)).sort();
  }, [characters]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddClick = (group: string) => {
    if (viewMode === 'role') {
      // Map UI names to internal Role names
      const roleMap: Record<string, string> = {
        'Main Characters': 'Main',
        Supporting: 'Supporting',
        Side: 'Side',
        Other: 'Other',
      };
      setPreSelectedRole(roleMap[group] || 'Main');
    }
    setIsModalOpen(true);
  };

  const renderCharacterList = (filterValue: string, type: ViewMode) => {
    const filtered = characters.filter((c) => {
      if (type === 'role') {
        // Handle mapping internal 'Main' to UI 'Main Characters'
        if (filterValue === 'Main Characters') return c.role === 'Main';
        return c.role === filterValue;
      }
      return c.display_name[0]?.toUpperCase() === filterValue;
    });

    return (
      <div className="flex flex-col mb-2">
        <AnimatePresence initial={false}>
          {filtered.map((char, cIdx) => (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <SidebarItem
                index={cIdx}
                title={char.display_name}
                level={1}
                isActive={activeCharacterId === char.id}
                onClick={() => onSelectCharacter(char.id)}
                icon={<User className="w-3.5 h-3.5 text-slate-400" />}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <button
          onClick={() => handleAddClick(filterValue)}
          className="ml-9 py-1.5 text-left text-[12px] text-slate-400 hover:text-purple-500 transition-colors cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-3 h-3" />
          <span>Add character...</span>
        </button>
      </div>
    );
  };

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
        <p className="text-xs text-slate-500 mb-3">
          No characters in this project yet.
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-md text-[12px] hover:bg-purple-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create first character
        </button>
        {isModalOpen && (
          <NewCharacterForm
            projectId={projectId}
            initialRole="Main"
            onCharacterCreated={(newChar) => {
              setIsModalOpen(false);
              fetchCharacters();
              onSelectCharacter(newChar.id);
            }}
            onCancel={() => setIsModalOpen(false)}
          />
        )}
      </div>
    );
  }

  const currentGroups = viewMode === 'role' ? roles : alphabet;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 mb-4 mt-2">
        <SegmentedControl
          fullWidth
          activeValue={viewMode}
          onChange={setViewMode}
          options={[
            { label: 'By Role', value: 'role' },
            { label: 'Alphabetical', value: 'alpha' },
          ]}
        />
      </div>

      <div className="flex flex-col space-y-1 overflow-y-auto custom-scrollbar">
        {currentGroups.map((group, idx) => {
          const isCollapsed = !expandedSections.has(group);
          // Count items for the subtitle
          const count = characters.filter((c) => {
            if (viewMode === 'role') {
              return group === 'Main Characters'
                ? c.role === 'Main'
                : c.role === group;
            }
            return c.display_name[0]?.toUpperCase() === group;
          }).length;

          return (
            <div key={`${viewMode}-${group}`} className="flex flex-col">
              <SidebarItem
                title={group}
                index={idx}
                subtitle={`${count} character${count !== 1 ? 's' : ''}`}
                isCollapsible
                isCollapsed={isCollapsed}
                onToggle={() => toggleSection(group)}
                icon={<Users className="w-4 h-4 text-purple-400" />}
              />

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {renderCharacterList(group, viewMode)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <NewCharacterForm
          projectId={projectId}
          initialRole={preSelectedRole}
          onCharacterCreated={(newChar) => {
            setIsModalOpen(false);
            fetchCharacters();
            onSelectCharacter(newChar.id);
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
