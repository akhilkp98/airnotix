import type { DemoUser } from './demoData';
import type { AppNotification } from './workspace';

/**
 * Port of `visibleNotifications` in `src/js/modules/session.js`.
 * A row is visible when its user id matches, or when its audience role matches.
 */
export function visibleNotifications(notes: AppNotification[], user: Pick<DemoUser, 'id' | 'role'> | null) {
  if (!user) return [];
  return notes.filter((item) => {
    if (item.userId && item.userId === user.id) return true;
    return Boolean(item.audienceRole) && item.audienceRole === user.role;
  });
}

/** Maps a stored prototype href onto the React route. Unknown hrefs are not turned into links. */
export function notificationRoute(href: string) {
  if (href === 'approvals.html') return '/approvals';
  if (href === 'finance.html') return '/finance';
  if (href === 'maintenance.html') return '/maintenance';
  if (href === 'portal-schedule.html') return '/portal/schedule';
  const flight = /^flight-operations\.html\?id=([^&]+)$/.exec(href);
  if (flight) return `/flight-operations/${flight[1]}`;
  const documents = /^documents\.html(?:\?review=([^&]+))?$/.exec(href);
  if (documents) return documents[1] ? `/documents?review=${documents[1]}` : '/documents';
  const cadet = /^cadets\.html\?id=([^&]+)/.exec(href);
  if (cadet) return `/cadets/${cadet[1]}`;
  return null;
}
