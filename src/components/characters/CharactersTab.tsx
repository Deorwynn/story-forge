import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users } from 'lucide-react';
import Stage from '../layout/Stage';
import ContextualToolbar from '../shared/ContextualToolbar';
import SegmentedControl from '../shared/SegmentedControl';
import EmptyState from '../shared/EmptyState';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function CharacterTab() {
  const { character, updateCharacter } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'sheet' | 'themes'>('sheet');

  const handleCreateFirst = () => {
    console.log('Opening character creation...'); // to be implemented
  };

  const isCharacterActive = !!character;

  return (
    <Stage variant="wide">
      {isCharacterActive ? (
        <>
          <ContextualToolbar
            title={character.name || 'Unnamed Character'}
            status="Main Character"
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
                <div className="bg-white border border-slate-200 p-10 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3">
                    Character Name
                  </label>
                  <input
                    className="w-full text-xl font-medium text-slate-800 bg-transparent border-b border-slate-100 focus:border-purple-400 outline-none pb-2 transition-colors"
                    value={character.name}
                    onChange={(e) => updateCharacter(e.target.value)}
                    placeholder="e.g. Alaric the Bold"
                  />
                </div>
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
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex items-center justify-center"
        >
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="You don't have any character sheets for this story yet."
            description="Every masterpiece starts with a single character. Create a character sheet and forge your first hero (or villain)!"
            actionLabel="Create your first character sheet"
            onAction={handleCreateFirst}
          />
        </motion.div>
      )}
    </Stage>
  );
}
