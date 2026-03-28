import { createContext, useContext, ReactNode } from 'react';
import { Project } from '../types/project';
import { Character } from '../types/character';
import { ManuscriptDoc } from '../types/document';

interface WorkspaceContextType {
  project: Project | null;
  character: Character | null;
  status: string;
  documents: ManuscriptDoc[];
  isLoadingDocs: boolean;
  updateCharacter: (name: string) => void;
  refreshDocuments: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

export function WorkspaceProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WorkspaceContextType;
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context)
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
};
