import { DEMO_TODAY } from '../../domain/fixtures';
import type { Flight, StaffMember } from '../../domain/workspace';

export const FLIGHT_STATUSES = ['Draft', 'Awaiting approval', 'Approved', 'Rejected', 'Completed', 'Cancelled'] as const;
export const FLIGHT_TYPES = ['Training', 'Progress check'] as const;
export const COMPLETION_OUTCOMES = ['Satisfactory', 'Further Training Required', 'Not Assessed'] as const;
export const ATTENDANCE_OPTIONS = ['Present', 'Absent'] as const;

export type FlightView = 'week' | 'day' | 'agenda';

export function flightView(value: string | null): FlightView {
  if (value === 'day' || value === 'agenda' || value === 'week') return value;
  return 'week';
}

export function flightDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : DEMO_TODAY;
}

/** Staff whose role matches the prototype instructor field. */
export function instructorStaff(staff: StaffMember[]) {
  return staff.filter((member) => /instructor/i.test(member.role));
}

export function filterScheduleFlights(
  flights: Flight[],
  options: { status: string; aircraftId: string; dates: string[]; view: FlightView; date: string },
) {
  return flights
    .filter((flight) => {
      if (options.status && flight.status !== options.status) return false;
      if (options.aircraftId && flight.aircraftId !== options.aircraftId) return false;
      if (options.view === 'day') return flight.date === options.date;
      return options.dates.includes(flight.date);
    })
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
}

export function validateFlightDraft(input: {
  date: string;
  start: string;
  end: string;
  cadetId: string;
  instructorId: string;
  aircraftId: string;
}) {
  const fields: {
    date?: string;
    start?: string;
    end?: string;
    cadetId?: string;
    instructorId?: string;
    aircraftId?: string;
  } = {};
  if (!input.date) fields.date = 'Date is required.';
  if (!input.start) fields.start = 'Start is required.';
  if (!input.end) fields.end = 'End is required.';
  if (!input.cadetId) fields.cadetId = 'Cadet is required.';
  if (!input.instructorId) fields.instructorId = 'Instructor is required.';
  if (!input.aircraftId) fields.aircraftId = 'Aircraft is required.';
  const message = Object.keys(fields).length
    ? 'Date, times, cadet, instructor, and aircraft are required.'
    : '';
  return { ok: !message, message, fields };
}

export function validateCompletion(input: { start: string; end: string; hours: string; outcome: string }) {
  const hours = Number(input.hours);
  const fields: { start?: string; end?: string; hours?: string; outcome?: string } = {};
  if (!input.start) fields.start = 'Actual start is required.';
  if (!input.end) fields.end = 'Actual end is required.';
  if (!input.hours || !hours || hours <= 0) fields.hours = 'Actual hours must be greater than 0.';
  if (!input.outcome) fields.outcome = 'Outcome is required.';
  const message = Object.keys(fields).length ? 'Actual times, hours, and an outcome are required.' : '';
  return { ok: !message, message, fields };
}

export function validateCorrection(hours: string, reason: string) {
  const nextHours = Number(hours);
  const fields: { hours?: string; reason?: string } = {};
  if (!hours || !nextHours || nextHours <= 0) fields.hours = 'A revised hour value is required.';
  if (!reason.trim()) fields.reason = 'A reason is required.';
  const message = Object.keys(fields).length ? 'A revised hour value and a reason are required.' : '';
  return { ok: !message, message, fields };
}
