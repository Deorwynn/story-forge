export interface Book {
  id: string;
  title: string;
  orderIndex: number;
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
  books: Book[];
  pov?: string;
}
