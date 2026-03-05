import { useState } from 'react';
import { Project } from '../../types/project';

interface ProjectCardProps {
  project: Project;
  onSelect: (p: Project) => void;
  onDelete: (id: string) => void;
  onEdit: (p: Project) => void;
}

export default function ProjectCard({
  project,
  onSelect,
  onDelete,
  onEdit,
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="group relative h-56">
      {/* CARD BUTTON */}
      <button
        onClick={() => onSelect(project)}
        className="w-full h-full p-6 bg-white border border-slate-200 rounded-2xl 
                   hover:border-[#9333ea] hover:shadow-xl hover:shadow-purple-50 
                   focus:outline-none focus:ring-2 focus:ring-[#9333ea] focus:ring-offset-4
                   transition-all text-left cursor-pointer relative flex flex-col overflow-hidden shadow-sm"
      >
        {/* Animated Left Border */}
        <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-[#9333ea] transition-all duration-300" />

        <div className="flex justify-between items-start mb-4 pr-8 w-full">
          <span className="px-2.5 py-1 rounded-lg bg-[#f3e8ff] text-[#9333ea] text-[10px] font-bold uppercase tracking-widest border border-[#e9d5ff]">
            {project.genre || 'General'}
          </span>
          <span className="text-slate-400 text-[10px] font-medium italic">
            Edited {formatTimeAgo(project.updatedAt)}
          </span>
        </div>

        <h3 className="text-xl font-bold mb-2 text-slate-800 group-hover:text-[#9333ea] transition-colors line-clamp-1">
          {project.name}
        </h3>

        <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed mb-4 flex-grow">
          {project.description ||
            'Every epic journey begins with a single word...'}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 w-full mt-auto">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em]">
            {project.type}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#9333ea] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </button>

      {/* THREE-DOT MENU */}
      <div className="absolute top-4 right-4 z-20">
        <button
          aria-label="More options"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#9333ea] transition-colors cursor-pointer"
        >
          <span className="font-black text-lg leading-none mb-1">...</span>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-purple-50 hover:text-[#9333ea] flex items-center gap-3 transition-colors"
              >
                <span className="text-base">✎</span> <span>Edit details</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
              >
                <span className="text-base">🗑</span> <span>Move to Trash</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
