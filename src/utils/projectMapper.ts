import { Project } from '../types/project';

/**
 * Maps raw database project objects to the frontend Project type.
 * Handles fallback values for dates and naming conventions.
 */
export function mapRawProject(p: any): Project {
  return {
    id: p.id,
    name: p.name || 'Untitled Story',
    type: p.projectType || p.type,
    volumes: p.bookCount || 1,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    lastOpened: p.updatedAt || Math.floor(Date.now() / 1000),
    genre: p.genre || 'General',
    description: p.description || '',
  };
}
