import { Project } from '../types/project';

/**
 * Maps raw database project objects to the frontend Project type.
 * Handles fallback values for dates and naming conventions.
 */
export function mapRawProject(p: any): Project {
  console.log('RAW FROM DB:', p);
  return {
    id: p.id,
    name: p.name || 'Untitled Story',
    seriesName: p.series_name || p.seriesName || '',
    volumeNumber: p.volume_number || p.volumeNumber || 1,
    type: p.project_type || p.type,
    bookCount: p.book_count || p.bookCount || 1,
    createdAt: p.created_at || p.createdAt,
    updatedAt: p.updated_at || p.updatedAt,
    lastOpened: p.last_opened || p.updatedAt || Math.floor(Date.now() / 1000),
    genres: Array.isArray(p.genres) ? p.genres : [],
    description: p.description || '',
    books: p.books || [],
    pov: p.pov,
  };
}
