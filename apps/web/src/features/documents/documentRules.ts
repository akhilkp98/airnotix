import type { AcademyDocument } from '../../domain/workspace';

/** Review values the prototype toolbar offers. An empty value means all rows. */
export const DOCUMENT_REVIEW_FILTERS = [
  { value: '', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Accepted', label: 'Accepted' },
] as const;

export function filterDocuments(documents: AcademyDocument[], review: string, search: string) {
  const query = search.trim().toLowerCase();
  return documents.filter((item) => {
    if (review && item.review !== review) return false;
    if (!query) return true;
    return `${item.title} ${item.category}`.toLowerCase().includes(query);
  });
}
