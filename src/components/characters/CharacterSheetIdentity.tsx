import { Fingerprint, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function IdentitySection({
  character,
  onUpdate,
}: {
  character: any;
  onUpdate: (field: string, value: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-slate-100 rounded-3xl overflow-hidden mb-6 bg-slate-50/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Fingerprint className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700">
            Core Identity
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* AGE */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              Current Age
            </label>
            <input
              type="text"
              value={character.metadata?.base_age || ''}
              onChange={(e) => onUpdate('base_age', e.target.value)}
              placeholder="e.g. 24"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 transition-all"
            />
          </div>

          {/* OCCUPATION */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              Occupation / Role
            </label>
            <input
              type="text"
              value={character.occupation || ''}
              onChange={(e) => onUpdate('occupation', e.target.value)}
              placeholder="e.g. Archive Keeper"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 transition-all"
            />
          </div>

          {/* RACE/SPECIES */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              Race / Species
            </label>
            <input
              type="text"
              value={character.metadata?.race || ''}
              onChange={(e) => onUpdate('race', e.target.value)}
              placeholder="e.g. Dryad, Human, Dragon-kin"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 transition-all"
            />
          </div>

          {/* PRONOUNS / GENDER */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              Gender / Pronouns
            </label>
            <input
              type="text"
              value={character.metadata?.gender || ''}
              onChange={(e) => onUpdate('gender', e.target.value)}
              placeholder="e.g. She/Her"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
}
