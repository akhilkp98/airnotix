import { DEMO_TODAY } from '../../domain/fixtures';
import { notificationRoute } from '../../domain/notifications';
import type { PortalFlight } from '../../domain/workspace';

/** Approved flights on or after the demo day, in stored order. */
export function upcomingFlights(flights: readonly PortalFlight[]) {
  return flights.filter((flight) => flight.status === 'Approved' && flight.date >= DEMO_TODAY);
}

/** Approved flights before the demo day. The prototype schedule still includes them. */
export function earlierApprovedFlights(flights: readonly PortalFlight[]) {
  return flights.filter((flight) => flight.status === 'Approved' && flight.date < DEMO_TODAY);
}

export function completedFlights(flights: readonly PortalFlight[]) {
  return flights.filter((flight) => flight.status === 'Completed');
}

/** A portal notification opens a portal route only. Staff routes are not linked. */
export function portalNotePath(href: string) {
  const path = notificationRoute(href);
  return path && path.startsWith('/portal') ? path : null;
}
