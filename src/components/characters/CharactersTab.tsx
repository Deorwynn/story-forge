import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Stage from '../layout/Stage';
import ContextualToolbar from '../shared/ContextualToolbar';
import SegmentedControl from '../shared/SegmentedControl';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function CharacterTab() {
  const { character, updateCharacter } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'sheet' | 'themes'>('sheet');

  return (
    <Stage variant="wide">
      <ContextualToolbar title="Elena Rivers" status="Main Character">
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
          transition={{ duration: 0.1 }}
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
            <div>
              <h1>Theme Settings</h1>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Stage>
  );
}
