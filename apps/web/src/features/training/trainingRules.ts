import type { Cadet, Syllabus } from '../../domain/workspace';

/** Outcomes offered by the prototype assessment form. */
export const ASSESSMENT_OUTCOMES = ['Satisfactory', 'Further Training Required', 'Not Assessed'] as const;

/** Item types offered by the prototype syllabus item form. */
export const SYLLABUS_ITEM_TYPES = [
  'Knowledge item',
  'Ground lesson',
  'Flight exercise',
  'Assessment',
  'Progress check',
] as const;

export function validateAssessment(input: { cadetId: string; itemId: string; outcome: string }) {
  const fields: { cadetId?: string; itemId?: string; outcome?: string } = {};
  if (!input.cadetId) fields.cadetId = 'Cadet is required.';
  if (!input.itemId) fields.itemId = 'Training item is required.';
  if (!input.outcome) fields.outcome = 'Outcome is required.';
  const message = Object.keys(fields).length ? 'Cadet, training item, and outcome are required.' : '';
  return { ok: !message, message, fields };
}

/** Client filter on the visible register. The prototype progress table has no search box. */
export function filterProgressCadets(cadets: Cadet[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return cadets;
  return cadets.filter((cadet) => `${cadet.code} ${cadet.firstName} ${cadet.lastName}`.toLowerCase().includes(query));
}

/** Prototype ground-school view: published knowledge items and ground lessons only. */
export function publishedGroundAndKnowledge(syllabi: Syllabus[]) {
  const names: string[] = [];
  syllabi.filter((syllabus) => syllabus.status === 'Published').forEach((syllabus) => {
    syllabus.phases.forEach((phase) => {
      phase.items.forEach((item) => {
        if (item.type === 'Ground lesson' || item.type === 'Knowledge item') names.push(item.name);
      });
    });
  });
  return names;
}
