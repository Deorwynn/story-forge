import { ForgeView } from '../../navigation/Router';
import { useWorkspace } from '../../context/WorkspaceContext';
import ManuscriptContent from '../write/ManuscriptContent';
import CharactersContent from '../characters/CharactersContent';

interface SidebarProps {
  activeTab: ForgeView;
}

export default function Sidebar({ activeTab }: SidebarProps) {
  const { project } = useWorkspace();
  const bookId =
    project?.type === 'standalone'
      ? project.books?.[0]?.id // Standalone: Always use the only book available
      : project?.books?.find(
          // Series: Find by volume number
          (b: any) => b.orderIndex === (project?.volumeNumber || 1) - 1
        )?.id || project?.books?.[0]?.id;
  return (
    <aside className="w-64 bg-[#f1f5f9] border-r border-slate-200 h-full flex flex-col">
      {/* Dynamic Header based on Tab */}
      <div className="p-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {activeTab === 'Write'
            ? 'Manuscript'
            : activeTab === 'Characters'
              ? 'Characters'
              : activeTab === 'Plot'
                ? 'Outline'
                : 'Navigation'}
        </h3>
      </div>

      {/* Scrollable Conditional Content Rendering */}
      <div
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pl-6 pr-2 pb-6 scrollbar-gutter-stable"
        key={activeTab === 'Write' ? `manuscript-${bookId}` : activeTab}
      >
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
