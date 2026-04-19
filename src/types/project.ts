export interface Draft {
  id: string;
  book_id: string;
  name: string;
  version_number: number;
  is_complete: boolean;
  is_locked: boolean;
  created_at: number;
}

export interface Book {
  id: string;
  projectId: string;
  title: string;
  orderIndex: number;
  drafts?: Draft[];
}

export interface Project {
  id: string;
  name: string;
  seriesName: string;
  volumeNumber: number;
  type: 'standalone' | 'series';
  bookCount: number;
  createdAt: number;
  updatedAt: number;
  lastOpened: number;
  cloudSyncId?: string;
  genres: string[];
  description: string;
  coverPath?: string;
  books: Book[];
  pov?: string;
}
