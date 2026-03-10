import { ForgeView } from '../../navigation/Router';
import ManuscriptContent from '../write/ManuscriptContent';
import CharactersContent from '../characters/CharactersContent';

interface SidebarProps {
  activeTab: ForgeView;
}

export default function Sidebar({ activeTab }: SidebarProps) {
  return (
    <aside className="w-64 bg-[#f1f5f9] border-r border-slate-200 p-4 h-full flex flex-col overflow-y-auto no-scrollbar">
      {/* Dynamic Header based on Tab */}
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
        {activeTab === 'Write'
          ? 'Manuscript'
          : activeTab === 'Characters'
            ? 'Characters'
            : activeTab === 'Plot'
              ? 'Outline'
              : 'Navigation'}
      </h3>

      {/* Conditional Content Rendering */}
      <div className="flex-1">
        {activeTab === 'Write' && <ManuscriptContent />}
        {activeTab === 'Characters' && <CharactersContent />}

        {/* Fallback for tabs that aren't built yet */}
        {!['Write', 'Characters'].includes(activeTab) && (
          <p className="text-xs text-slate-400 italic">
            Content for {activeTab} coming soon...
          </p>
        )}
      </div>
    </aside>
  );
}
