export interface Project {
  id: string;
  name: string;
  type: 'standalone' | 'series';
  volumes: number;
  createdAt: number;
  updatedAt: number;
  lastOpened: number;
  cloudSyncId?: string;
  genre: string;
  description: string;
}
