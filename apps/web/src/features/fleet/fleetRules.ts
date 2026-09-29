import { DEMO_TODAY } from '../../domain/fixtures';
import type { Aircraft, Flight } from '../../domain/workspace';

/** Status values the prototype status form offers. */
export const AIRCRAFT_STATUSES = ['Available', 'Maintenance', 'Restricted'] as const;

/** Literal fallback in the prototype when a restriction has no until date. */
export const DEFAULT_RESTRICTION_UNTIL = '2026-10-31';

/**
 * Client filter on identifier, type, and the prototype status query.
 * The HTML fleet list filtered by status only. Search uses fields the record already stores.
 */
export function filterAircraft(aircraft: Aircraft[], search: string, status: string) {
  const query = search.trim().toLowerCase();
  return aircraft.filter((item) => {
    if (status && item.status !== status) return false;
    if (!query) return true;
    return `${item.code} ${item.type}`.toLowerCase().includes(query);
  });
}

/** Bookings on or after the demo day, excluding cancelled flights. Same count as the prototype fleet table. */
export function upcomingBookings(flights: Flight[], aircraftId: string) {
  return flights.filter((flight) => (
    flight.aircraftId === aircraftId && flight.date >= DEMO_TODAY && flight.status !== 'Cancelled'
  )).length;
}
