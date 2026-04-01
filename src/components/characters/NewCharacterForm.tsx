import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ModalShell from '../shared/ModalShell';
import Button from '../shared/Button';
import RoleSelector from './RoleSelector';

interface NewCharacterFormProps {
  projectId: string;
  initialRole?: string;
  onCharacterCreated: (character: any) => void;
  onCancel: () => void;
}

export const NewCharacterForm = ({
  projectId,
  initialRole = 'Main',
  onCharacterCreated,
  onCancel,
}: NewCharacterFormProps) => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState(initialRole || 'Main');
  const [isSaving, setIsSaving] = useState(false);

  const isFormValid = firstName.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('Sending to Rust:', role);
    e.preventDefault();
    if (!isFormValid) return;

    setIsSaving(true);
    try {
      // Compose the display name: "First Middle Last"
      // filter(Boolean) removes empty strings if middle/last are missing
      const displayName = [firstName, middleName, lastName]
        .map((n) => n.trim())
        .filter(Boolean)
        .join(' ');

      const newCharacter = await invoke('create_character', {
        projectId: projectId,
        bookId: null,
        displayName,
        role: role,
        race: 'Human',
        metadata: {
          first_name: firstName.trim(),
          middle_name: middleName.trim(),
          last_name: lastName.trim(),
          base_age: 0,
          languages: [],
        },
      });

      // Brief delay for DB stability
      await new Promise((resolve) => setTimeout(resolve, 100));

      onCharacterCreated(newCharacter);
    } catch (err) {
      console.error('FORGE ERROR:', err);
      alert(`Failed to create character: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title="Forge New Character"
      onClose={onCancel}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 py-4">
        {/* NAME INPUTS */}
        <div className="space-y-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-all">
            Character Identity
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#9333ea] focus:bg-white outline-none transition-all placeholder:text-slate-300 text-sm"
              placeholder="First Name *"
              required
            />

            <input
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#9333ea] focus:bg-white outline-none transition-all placeholder:text-slate-300 text-sm"
              placeholder="Middle"
            />

            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#9333ea] focus:bg-white outline-none transition-all placeholder:text-slate-300 text-sm"
              placeholder="Last Name"
            />
          </div>
        </div>

        {/* ROLE SELECTION */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Narrative Weight
          </label>
          <RoleSelector selected={role} onSelect={setRole} />
        </div>

        {/* FOOTER BUTTONS */}
        <div className="flex gap-4 pt-6 border-t border-slate-50">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-[2]"
            disabled={!isFormValid}
            isLoading={isSaving}
          >
            Create Character
          </Button>
        </div>
      </form>
    </ModalShell>
  );
};
