import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, UserSearch } from 'lucide-react'; // Added UserSearch
import Stage from '../layout/Stage';
import ContextualToolbar from '../shared/ContextualToolbar';
import SegmentedControl from '../shared/SegmentedControl';
import EmptyState from '../shared/EmptyState';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NewCharacterForm } from './NewCharacterForm';
import CharacterSheetView from './CharacterSheetView';
import { invoke } from '@tauri-apps/api/core';

export default function CharacterTab() {
  const { character, updateCharacter, project } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'sheet' | 'themes'>('sheet');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasAnyCharacters, setHasAnyCharacters] = useState<boolean | null>(
    null
  );

  const projectId = project?.id || '';

  // Check if any characters exist for the Empty vs Idle state
  useEffect(() => {
    if (projectId) {
      invoke<any[]>('get_characters', { projectId })
        .then((list) => setHasAnyCharacters(list.length > 0))
        .catch(() => setHasAnyCharacters(false));
    }
  }, [projectId, character]); // Re-check when a character is created/deleted

  const handleCharacterCreated = (newChar: any) => {
    updateCharacter(newChar);
    setIsModalOpen(false);
    setHasAnyCharacters(true);
  };

  return (
    <Stage variant="wide">
      {character ? (
        <>
          <ContextualToolbar
            title="Character Profile"
            status={character?.display_name || 'Unnamed'}
          >
            <SegmentedControl
              activeValue={activeTab}
              onChange={setActiveTab}
              options={[
                { label: 'Character Sheet', value: 'sheet' },
                { label: 'Character Theme', value: 'themes' },
              ]}
            />
          </ContextualToolbar>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'sheet' ? (
                <motion.div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                  <CharacterSheetView characterId={character.id} />
                </motion.div>
              ) : (
                <div className="p-10 text-slate-500">
                  <h1 className="text-lg font-semibold mb-4">Theme Settings</h1>
                  <p className="text-sm">
                    Customize visual presets for this character card.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      ) : hasAnyCharacters ? (
        /* IDLE STATE: Characters exist, but none selected */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex items-center justify-center"
        >
          <EmptyState
            icon={<UserSearch className="w-8 h-8 text-slate-300" />}
            title="No character selected"
            description="Pick a character from the sidebar to continue forging their story."
          />
        </motion.div>
      ) : (
        /* EMPTY STATE: No characters at all */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex items-center justify-center"
        >
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="You don't have any character sheets yet."
            description="Every masterpiece starts with a hero. Create a sheet to begin."
            actionLabel="Create your first character sheet"
            onAction={() => setIsModalOpen(true)}
          />
        </motion.div>
      )}

      {isModalOpen && projectId && (
        <NewCharacterForm
          projectId={projectId}
          onCharacterCreated={handleCharacterCreated}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </Stage>
  );
}
