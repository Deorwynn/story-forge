import ActionMenu, { ActionItem } from '../shared/ActionMenu';

interface SidebarItemProps {
  title: string;
  subtitle?: string;
  actions: ActionItem[];
  onClick?: () => void;
  isActive?: boolean;
}

export default function SidebarItem({
  title,
  subtitle,
  actions,
  onClick,
  isActive,
}: SidebarItemProps) {
  return (
    <div
      className={`group relative flex items-center gap-1 px-2 py-1 rounded-lg transition-colors 
      ${isActive ? 'bg-purple-50' : 'hover:bg-slate-50'}`}
    >
      <button
        onClick={onClick}
        className="flex flex-1 items-start gap-2 text-sm font-semibold text-left transition-colors cursor-pointer"
      >
        <span className="text-[10px] mt-1 text-slate-400 opacity-50 group-hover:opacity-100">
          ▼
        </span>
        <div className="flex flex-col">
          <span
            className={`${isActive ? 'text-[#9333ea]' : 'text-slate-700'} group-hover:text-[#9333ea]`}
          >
            {title}
          </span>
          {subtitle && (
            <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tight">
              {subtitle}
            </span>
          )}
        </div>
      </button>

      <ActionMenu actions={actions} />
    </div>
  );
}
