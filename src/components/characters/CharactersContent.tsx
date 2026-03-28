import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, User, Plus } from 'lucide-react';
import SidebarItem from '../layout/SidebarItem';
import SegmentedControl from '../shared/SegmentedControl';

type ViewMode = 'role' | 'alpha';

export default function CharactersContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('role');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Main Characters', 'D'])
  );

  const roles = ['Main Characters', 'Supporting', 'Side', 'Other'];
  const alphabet = ['D', 'E', 'K', 'L'];
  const characters = [
    { id: '1', name: 'Delon', role: 'Main Characters', initial: 'D' },
    { id: '2', name: 'Elena Rivers', role: 'Main Characters', initial: 'E' },
    { id: '3', name: 'Lina', role: 'Supporting', initial: 'L' },
  ];

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderCharacterList = (filterValue: string, type: ViewMode) => {
    const filtered = characters.filter((c) =>
      type === 'role' ? c.role === filterValue : c.initial === filterValue
    );

    return (
      <div className="flex flex-col mb-2">
        <AnimatePresence initial={false}>
          {filtered.map((char, cIdx) => (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SidebarItem
                index={cIdx}
                title={char.name}
                level={1}
                icon={<User className="w-3.5 h-3.5 text-slate-400" />}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <button className="ml-9 py-1.5 text-left text-[12px] text-slate-400 hover:text-purple-500 transition-colors cursor-pointer flex items-center gap-2 sidebar-item-animate">
          <Plus className="w-3 h-3" />
          <span>Add character...</span>
        </button>
      </div>
    );
  };

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

      <div className="flex flex-col space-y-1">
        {currentGroups.map((group, idx) => {
          const isCollapsed = !expandedSections.has(group);
          return (
            <div key={`${viewMode}-${group}`} className="flex flex-col">
              <SidebarItem
                title={group}
                index={idx}
                subtitle={viewMode === 'role' ? '0 characters' : '1 character'}
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
    </div>
  );
}
