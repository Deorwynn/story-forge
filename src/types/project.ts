export interface Project {
  id: string;
  name: string;
  type: 'standalone' | 'series';
  expectedBookCount: number;
  createdAt: number;
  lastOpened: number;
  cloudSyncId?: string;
}
