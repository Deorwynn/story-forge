import { User, Users, UserPlus, HelpCircle } from 'lucide-react';

export const CHARACTER_ROLES = [
  { label: 'Main', value: 'Main', icon: <User className="w-5 h-5" /> },
  {
    label: 'Supporting',
    value: 'Supporting',
    icon: <Users className="w-5 h-5" />,
  },
  { label: 'Side', value: 'Side', icon: <UserPlus className="w-5 h-5" /> },
  { label: 'Other', value: 'Other', icon: <HelpCircle className="w-5 h-5" /> },
];

export default function RoleSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 min-[500px]:grid-cols-2 gap-3">
      {CHARACTER_ROLES.map((r) => {
        const isSelected = selected === r.value;

        return (
          <button
            key={r.value}
            type="button"
            onClick={() => onSelect(r.value)}
            className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-purple-400
              ${
                isSelected
                  ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                  : 'bg-slate-50 border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'
              }`}
          >
            <div
              className={`p-2 rounded-lg ${isSelected ? 'bg-purple-100' : 'bg-slate-100'}`}
            >
              {r.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {r.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
