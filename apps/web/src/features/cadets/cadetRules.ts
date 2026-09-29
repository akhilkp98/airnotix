import { DEMO_TODAY } from '../../domain/fixtures';
import type { Cadet, CadetInput, Flight, StaffMember } from '../../domain/workspace';

/** Status values offered by the prototype cadet list and profile. Archived is selectable even though the seed has none. */
export const CADET_STATUS_OPTIONS = ['Active', 'On Hold', 'Completed', 'Archived'] as const;

export type CadetFieldErrors = {
  firstName?: string;
  lastName?: string;
  courseId?: string;
  joiningDate?: string;
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side copy of the checks in `saveCadet`.
 * The repository remains the authority when the form is submitted.
 */
export function validateCadetForm(input: CadetInput): { errors: CadetFieldErrors; error?: string } {
  const errors: CadetFieldErrors = {};
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const email = String(input.email || '').trim();
  if (!firstName) errors.firstName = 'First name is required.';
  if (!lastName) errors.lastName = 'Last name is required.';
  if (!input.courseId) errors.courseId = 'Course is required.';
  if (!input.joiningDate) errors.joiningDate = 'Joining date is required.';
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address, or leave it blank.';
  }
  if (!firstName || !lastName || !input.courseId || !input.joiningDate) {
    return { errors, error: 'First name, last name, course, and joining date are required.' };
  }
  if (errors.email) return { errors, error: errors.email };
  return { errors };
}

/** Prototype list filter: code, full name, and batch. Course and status match the stored ids and status. */
export function filterCadets(cadets: readonly Cadet[], query: { search: string; courseId: string; status: string }) {
  const search = query.search.trim().toLowerCase();
  return cadets.filter((cadet) => {
    if (query.status && cadet.status !== query.status) return false;
    if (query.courseId && cadet.courseId !== query.courseId) return false;
    if (!search) return true;
    return `${cadet.code} ${cadet.firstName} ${cadet.lastName} ${cadet.batch}`.toLowerCase().includes(search);
  });
}

/** Prototype instructor field: staff whose role text contains "instructor". */
export function instructorStaff(staff: readonly StaffMember[]) {
  return staff.filter((item) => /instructor/i.test(item.role));
}

/** First approved flight on or after the demo day, in the stored flight order. */
export function nextApprovedFlight(flights: readonly Flight[], cadetId: string) {
  return flights.find((flight) => flight.cadetId === cadetId && flight.status === 'Approved' && flight.date >= DEMO_TODAY);
}
