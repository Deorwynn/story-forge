import { useState, useEffect } from 'react';
import { Camera, Users } from 'lucide-react';

interface HeaderProps {
  displayName: string;
  role: string;
  onSaveName: (newName: string) => void;
}

export default function CharacterSheetHeader({
  displayName,
  role,
  onSaveName,
}: HeaderProps) {
  const [localName, setLocalName] = useState(displayName);

  // Sync local state if the prop changes
  useEffect(() => {
    setLocalName(displayName);
  }, [displayName]);

  const handleBlur = () => {
    const trimmed = localName.trim();
    if (trimmed === '') {
      // Snap-back logic: revert to the original name if empty
      setLocalName(displayName);
    } else if (trimmed !== displayName) {
      // Only save if it actually changed
      onSaveName(trimmed);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 mb-12">
      {/* PORTRAIT PLACEHOLDER */}
      <div className="relative group">
        <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-sm overflow-hidden flex items-center justify-center transition-all group-hover:border-purple-100">
          <Users className="w-12 h-12 text-slate-300 group-hover:text-purple-300 transition-colors" />

          {/* Overlay for "Upload" */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all cursor-pointer">
            <Camera className="text-white opacity-0 group-hover:opacity-100 w-6 h-6 transition-opacity" />
          </div>
        </div>
      </div>

      {/* NAME & ROLE INFO */}
      <div className="flex-1 text-center sm:text-left">
        <div className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-widest mb-3">
          {role}
        </div>

        <input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          className="block w-full bg-transparent text-4xl font-serif font-bold text-slate-800 outline-none border-b-2 border-transparent hover:border-slate-100 focus:border-purple-200 transition-all placeholder:text-slate-200"
          placeholder="Character Name"
        />

        <p className="mt-2 text-sm text-slate-400 italic">
          No description set for this character yet.
        </p>
      </div>
    </div>
  );
}
