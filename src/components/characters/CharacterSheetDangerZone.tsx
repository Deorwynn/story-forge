import { useState } from 'react';
import { Trash2, AlertOctagon, RefreshCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import ConfirmModal from '../shared/ConfirmModal';
import SectionShell from './SectionShell';

interface DangerZoneProps {
  characterId: string;
  characterName: string;
  onDeleted: () => void;
}

export default function CharacterSheetDangerZone({
  characterId,
  characterName,
  onDeleted,
}: DangerZoneProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const performDelete = async () => {
    setIsDeleting(true);
    setIsModalOpen(false);

    try {
      await invoke('delete_character', { id: characterId });
      onDeleted(); // Triggers the animation in CharacterSheetView
    } catch (err) {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SectionShell
        title="Danger Zone"
        icon={<AlertOctagon className="w-4 h-4 text-red-500" />}
        variant="danger"
        defaultOpen={false}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h4 className="text-sm font-bold text-slate-900 mb-1 italic">
              Delete {characterName || 'this character'}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              Once you delete this character sheet, all associated data, traits,
              and history for this character will be purged from the series
              database. This cannot be undone.
              <br />
              <br />
              <span className="font-semibold text-slate-400">Note:</span>{' '}
              Deleting a character sheet does not affect your manuscript!
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isDeleting}
            className="group flex items-center gap-3 px-6 py-3 bg-white border border-red-200 text-red-500 hover:bg-red-600 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-red-100 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
          >
            <div aria-hidden="true">
              {isDeleting ? (
                <RefreshCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 group-hover:animate-pulse" />
              )}
            </div>
            <span>{isDeleting ? 'Deleting...' : 'Delete Character Sheet'}</span>
          </button>
        </div>
      </SectionShell>

      <ConfirmModal
        isOpen={isModalOpen}
        variant="danger"
        title="Delete Character Sheet?"
        message={`Are you sure you want to delete the character sheet for ${characterName}? This will remove them from your library forever.`}
        confirmLabel="Delete Permanently"
        onConfirm={performDelete}
        onCancel={() => setIsModalOpen(false)}
      />
    </>
  );
}
