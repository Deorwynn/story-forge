import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ThreeDotsIcon } from './Icons';

export interface ActionItem {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  actions: ActionItem[];
  onOpenChange?: (open: boolean) => void;
}

export default function ActionMenu({ actions, onOpenChange }: ActionMenuProps) {
  return (
    <DropdownMenu.Root onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={`p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:opacity-100`}
        >
          <ThreeDotsIcon className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={5}
          align="end"
          className="min-w-[144px] bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {actions.map((action, i) => (
            <div key={`${action.label}-${i}`}>
              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className={`px-3 py-2 text-[11px] font-medium flex items-center gap-2 cursor-pointer outline-none transition-colors
                  ${
                    action.variant === 'danger'
                      ? 'text-red-500 focus:bg-red-50'
                      : 'text-slate-600 focus:bg-slate-50'
                  }`}
              >
                <span className="text-xs" aria-hidden="true">
                  {action.icon}
                </span>
                {action.label}
              </DropdownMenu.Item>

              {i < actions.length - 1 && (
                <DropdownMenu.Separator className="h-[1px] bg-slate-100 my-1 mx-2" />
              )}
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
