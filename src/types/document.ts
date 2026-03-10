export interface ManuscriptDoc {
  id: string;
  projectId: string;
  bookId?: string;
  parentId?: string;
  title: string;
  content: string;
  docType: 'chapter' | 'plot' | 'note' | 'brainstorm';
  version: number;
  isArchived: boolean;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
}
