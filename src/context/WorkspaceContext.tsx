import { createContext, useContext, ReactNode } from 'react';
import { Project } from '../types/project';

interface WorkspaceContextType {
  project: Project;
  character: { id: string; name: string };
  status: string;
  updateCharacter: (name: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
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
