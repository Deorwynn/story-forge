import { useState, useEffect, ReactElement, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import ActionMenu, { ActionItem } from '../shared/ActionMenu';

interface SidebarItemProps {
  title: string;
  subtitle?: string;
  actions: ActionItem[];
  onClick?: () => void;
  isActive?: boolean;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
  level?: number;
  icon?: ReactElement;
  onRename?: (newTitle: string) => void;
  isRenamingInitial?: boolean;
  index?: number;
}

export default function SidebarItem({
  title,
  subtitle,
  actions,
  onClick,
  isActive,
  isCollapsible,
  isCollapsed,
  onToggle,
  level = 0,
  icon,
  onRename,
  isRenamingInitial = false,
  index = 0,
}: SidebarItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(isRenamingInitial);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  // Sync editValue if title changes externally
  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    setIsRenaming(isRenamingInitial);
  }, [isRenamingInitial]);

  const handleBlur = () => {
    setIsRenaming(false);
    if (editValue.trim() !== title && onRename) {
      onRename(editValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 1. Stop the event from bubbling up to the <button>
    e.stopPropagation();

    // 2. Prevent the spacebar from acting as a "Click" on the parent button
    if (e.key === ' ') {
      // Allow the space to be typed, but don't let it trigger button behaviors
      e.stopPropagation();
    }

    if (e.key === 'Enter') {
      handleBlur();
    }

    if (e.key === 'Escape') {
      setEditValue(title);
      setIsRenaming(false);
    }
  };

  const handleMainClick = (_e: React.MouseEvent | React.KeyboardEvent) => {
    // If the click happened while we were renaming, do nothing.
    if (isRenaming) return;

    if (isCollapsible && onToggle) onToggle();
    if (onClick) onClick();
  };

  return (
    <div
      className={`group relative flex items-center rounded-lg transition-colors pr-1 sidebar-item-animate
      ${isActive ? 'bg-purple-50' : 'hover:bg-slate-50'}`}
      style={{
        paddingLeft: `${level * 16 + 8}px`,
        animationDelay: `${index * 30}ms`,
      }}
    >
      <button
        type="button"
        onClick={handleMainClick}
        className="flex flex-1 flex-col py-1 text-left transition-colors cursor-pointer min-w-0"
      >
        {/* Top Row: Chevron + Title */}
        <div className="flex items-center gap-2 w-full">
          {/* The Chevron slot */}
          {isCollapsible ? (
            <ChevronRight
              className={`w-4 h-4 text-gray-400 flex-shrink-0 
              ${!isCollapsed ? 'rotate-90' : 'rotate-0'}`}
            />
          ) : (
            /* This invisible spacer keeps scene icons aligned with chapter icons */
            <div className="w-4 flex-shrink-0" />
          )}

          {/* The Icon Slot */}
          {icon && <div className="flex-shrink-0">{icon}</div>}

          {isRenaming ? (
            <input
              ref={inputRef}
              className="text-sm font-semibold bg-white border border-purple-300 rounded px-1 outline-none w-full text-slate-700"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={`font-semibold truncate 
                ${isActive ? 'text-[#9333ea]' : level > 0 ? 'text-slate-600' : 'text-slate-700'}
                ${level > 0 ? 'text-[13px]' : 'text-sm'}`}
            >
              {title}
            </span>
          )}
        </div>

        {/* Bottom Row: Subtitle */}
        {subtitle && (
          <div className="flex items-center gap-2 w-full pl-6">
            <div className="w-4 flex-shrink-0" />
            <span className="text-[11px] font-normal text-slate-400 tracking-tight truncate">
              {subtitle}
            </span>
          </div>
        )}
      </button>

      {/* Action Menu: Visible on hover OR if the menu is actually open */}
      <div
        className={`flex-shrink-0 transition-opacity ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <ActionMenu actions={actions} onOpenChange={setIsMenuOpen} />
      </div>
    </div>
  );
}
