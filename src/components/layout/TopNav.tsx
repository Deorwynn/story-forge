import Button from '../shared/Button';
import { LibraryIcon, FeatherIcon } from '../shared/Icons';

export default function TopNav({
  onExit,
  projectName,
  activeTab,
  onTabChange,
}: {
  onExit: () => void;
  projectName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const menus = [
    'Write',
    'Revisions',
    'Plot',
    'Characters',
    'Worldbuilding',
    'Research',
    'Braindump',
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col shrink-0">
      {/* Top Row: Info and Library Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Logo Box */}
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center shadow-sm">
            <FeatherIcon className="w-6 h-6 text-white" />
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-gray-800 leading-tight">
              {projectName || 'Whispers in the Mist'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Your Creative Writing Studio
            </p>
          </div>
        </div>

        {/* Library Button */}
        <Button variant="outline" onClick={onExit} className="h-8 px-3 gap-2">
          <LibraryIcon className="w-4 h-4" />
          <span>Library</span>
        </Button>
      </div>

      {/* Bottom Row: Tab Navigation */}
      <div className="flex gap-1">
        {menus.map((m) => {
          const isActive = m === activeTab;
          return (
            <button
              key={m}
              onClick={() => onTabChange(m)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                ${
                  isActive
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {m}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
