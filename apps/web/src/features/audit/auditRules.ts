import type { AuditEvent } from '../../domain/workspace';

/** The two events shipped in the fixture. Later rows are written by `remember`. */
export const SEED_AUDIT_IDS = new Set(['audit-1', 'audit-2']);

export function isSeedAudit(event: AuditEvent) {
  return SEED_AUDIT_IDS.has(event.id);
}

/**
 * Search and action filter are extra. The prototype audit page lists every event.
 * Search uses the actor, action, summary, and reason already stored on the event.
 */
export function filterAudit(events: AuditEvent[], search: string, action: string) {
  const query = search.trim().toLowerCase();
  return events.filter((event) => {
    if (action && event.action !== action) return false;
    if (!query) return true;
    return `${event.actor} ${event.action} ${event.summary} ${event.reason}`.toLowerCase().includes(query);
  });
}

export function auditWhen(at: string) {
  return at.replace('T', ' ').slice(0, 16);
}
