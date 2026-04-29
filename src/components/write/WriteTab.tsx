import Stage from '../layout/Stage';
import WriteView from './WriteView';
import { useWorkspace } from '../../context/WorkspaceContext';
import EmptyState from '../shared/EmptyState';
import { PenLine } from 'lucide-react';

export default function WriteTab() {
  const { documents } = useWorkspace();

  const hasContent = documents.some((d) => d.docType === 'chapter');

  return (
    <Stage variant="full">
      {hasContent ? (
        <WriteView />
      ) : (
        <div className="h-full flex items-center justify-center">
          <EmptyState
            icon={<PenLine className="w-8 h-8 text-slate-300" />}
            title="The draft is empty"
            description="Create your first chapter in the sidebar to begin writing."
          />
        </div>
      )}
    </Stage>
  );
}
