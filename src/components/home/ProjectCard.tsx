import { Project } from '../../types/project';
import ProjectMenu from './ProjectMenu';

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
  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(timestamp * 1000));
  };

  return (
    <div
      className={`
      group relative h-80 flex flex-col bg-white border border-slate-200 rounded-2xl 
      hover:border-purple-400 focus-within:ring-2 focus-within:ring-purple-400 
      transition-all duration-300 overflow-hidden 
  
      shadow-[0_4px_12px_rgba(15,23,42,0.06),0_1px_4px_rgba(15,23,42,0.08)]
      hover:shadow-[0_12px_24px_rgba(15,23,42,0.08),0_4px_16px_rgba(147,51,234,0.12)]
    `}
    >
      {/* Animated Left Border */}
      <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full group-focus-within:h-full bg-[#9333ea] transition-all duration-300 z-40" />

      {/* Global Click Target */}
      <button
        onClick={() => onSelect(project)}
        className="absolute inset-0 w-full h-full cursor-pointer z-10 focus:outline-none"
        aria-label={`Open ${project.name}`}
      />

      {/* Integrated Cover & Title Area */}
      <div className="relative h-32 bg-slate-200 border-b border-slate-100 group-hover:bg-slate-300 transition-colors flex flex-col justify-end">
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-white via-white/40 to-transparent" />

        <div className="relative z-20 px-6 pb-3 pointer-events-none">
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#9333ea] transition-colors line-clamp-1 drop-shadow-sm">
            {project.type === 'series' ? project.seriesName : project.name}
          </h3>
          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mt-0.5 group-hover:text-purple-700 transition-colors drop-shadow-sm">
            {project.type === 'series'
              ? `Series (${project.bookCount} ${project.bookCount === 1 ? 'volume' : 'volumes'})`
              : 'Standalone Novel'}
          </p>
        </div>

        {/* Vertical Menu */}
        <ProjectMenu
          onEdit={() => onEdit(project)}
          onDelete={() => onDelete(project.id)}
        />
      </div>

      {/* Description & Metadata Area */}
      <div className="p-6 pt-4 flex flex-col relative z-20 pointer-events-none">
        <div className="h-[60px] mb-5">
          <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
            {project.description?.trim() ||
              'No description provided for this story yet.'}
          </p>
        </div>

        {/* Footer Area */}
        <div className="mt-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            {project.genres && project.genres.length > 0 ? (
              project.genres.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-1 rounded-lg bg-purple-100/50 text-[#9333ea] text-[10px] font-bold uppercase tracking-tight border border-purple-200/50"
                >
                  {g}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-purple-100/50 text-[#9333ea] text-[10px] font-bold uppercase tracking-tight border border-purple-200/50">
                General
              </span>
            )}
          </div>

          <div
            className="flex items-center justify-between pt-4 border-t border-slate-100"
            role="separator"
          >
            <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
              Last edited
            </span>
            <span className="text-slate-700 text-[12px] font-bold">
              {formatDate(project.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
