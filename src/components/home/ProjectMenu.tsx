import { useState } from 'react';

interface ProjectMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

interface MenuItemProps {
  onClick: (e: React.MouseEvent) => void;
  icon: string;
  label: string;
  variant?: 'default' | 'danger';
}

function MenuItem({
  onClick,
  icon,
  label,
  variant = 'default',
}: MenuItemProps) {
  const styles = {
    default: 'text-slate-600 hover:bg-purple-50 hover:text-[#9333ea]',
    danger: 'text-red-500 hover:bg-red-50 font-medium',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors cursor-pointer ${styles[variant]}`}
    >
      <span className="text-base leading-none" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function ProjectMenu({ onEdit, onDelete }: ProjectMenuProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setShowMenu(false);
  };

  const menuItems = [
    {
      label: 'Edit details',
      icon: '✎',
      onClick: onEdit,
      variant: 'default' as const,
    },
    {
      label: 'Move to Trash',
      icon: '🗑',
      onClick: onDelete,
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="absolute top-3 right-3 z-50 pointer-events-auto">
      {/* Three-dot Toggle Button */}
      <button
        aria-label="More options"
        aria-expanded={showMenu}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 w-8 h-8 flex flex-col items-center justify-center gap-0.5 rounded-lg bg-white hover:bg-slate-50 focus:bg-slate-50 backdrop-blur-sm text-slate-500 hover:text-[#9333ea] focus:text-[#9333ea] shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {[1, 2, 3].map((i) => (
          <span key={i} className="w-1 h-1 bg-current rounded-full" />
        ))}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            {menuItems.map((item) => (
              <MenuItem
                key={item.label}
                label={item.label}
                icon={item.icon}
                variant={item.variant}
                onClick={(e) => handleAction(e, item.onClick)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
