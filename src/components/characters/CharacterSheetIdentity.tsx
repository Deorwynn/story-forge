import { Fingerprint } from 'lucide-react';
import SectionShell from './SectionShell';

export default function IdentitySection({
  character,
  onUpdate,
}: {
  character: any;
  onUpdate: (field: string, value: any) => void;
}) {
  return (
    <SectionShell
      title="Core Identity"
      icon={<Fingerprint className="w-4 h-4 text-purple-500" />}
      defaultOpen={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </SectionShell>
  );
}
