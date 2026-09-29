import {
  feeAccount,
  formatDate,
  inr,
  progressPercent,
  recordedAircraftHours,
  recordedCadetHours,
} from '../../domain/calculations';
import type { ReportRecords, WorkspaceState } from '../../domain/workspace';

/** Prototype report ids and labels from `renderReports`. */
export const REPORTS = [
  ['roster', 'Cadet roster'],
  ['progress', 'Training progress'],
  ['hours', 'Flight hours'],
  ['fleet', 'Aircraft utilisation'],
  ['fuel', 'Fuel transactions'],
  ['fees', 'Fee collection'],
  ['documents', 'Document expiry'],
  ['audit', 'Audit activity'],
] as const;

export type ReportKind = (typeof REPORTS)[number][0];

export type ReportFilters = {
  courseId: string;
  status: string;
  from: string;
  to: string;
  aircraftId: string;
  instructorId: string;
  fuelType: string;
  review: string;
  search: string;
};

export type ReportRow = { id: string; cells: string[] };

export type ReportBar = { label: string; count: number };

export type ReportCard = { label: string; value: string; hint: string };

export type ReportModel = {
  kind: ReportKind;
  columns: string[];
  rows: ReportRow[];
  unfilteredCount: number;
  cards: ReportCard[];
  bars: ReportBar[];
  note: string;
};

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  courseId: '',
  status: '',
  from: '',
  to: '',
  aircraftId: '',
  instructorId: '',
  fuelType: '',
  review: '',
  search: '',
};

const REPORT_NOTE = 'Illustrative report for the demo workspace. Period basis is the seeded records, not a live operational extract. These figures are not a compliance or flight-release record.';

export function reportKind(value: string | null): ReportKind {
  return REPORTS.some(([id]) => id === value) ? (value as ReportKind) : 'roster';
}

/**
 * Fee rows require finance view. Audit rows require audit view.
 * Other reports stay available to anyone who can open Reports.
 * This is a demonstration UI check. The future API must enforce the same rule.
 */
export function canViewReport(kind: ReportKind, access: { finance: boolean; audit: boolean }) {
  if (kind === 'fees') return access.finance;
  if (kind === 'audit') return access.audit;
  return true;
}

function calculationState(records: ReportRecords): WorkspaceState {
  return {
    cadets: records.cadets,
    courses: records.courses,
    flights: records.flights,
    aircraft: records.aircraft,
    payments: records.payments,
    feePlans: records.feePlans,
  } as WorkspaceState;
}

function inRange(iso: string, from: string, to: string) {
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function barsFrom(labels: string[]): ReportBar[] {
  const counts = new Map<string, number>();
  labels.forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function rowCard(count: number): ReportCard {
  return { label: 'Rows', value: String(count), hint: 'Rows in this filtered report.' };
}

/**
 * Port of the eight tables in `renderReports`.
 * Course, status, date, aircraft, and instructor filters are extra. They use fields already stored on the records.
 * Defects, work orders, expenses, and availability blocks are not prototype reports.
 */
export function buildReport(records: ReportRecords, kind: ReportKind, filters: ReportFilters): ReportModel {
  const state = calculationState(records);
  const courseName = (courseId: string) => records.courses.find((course) => course.id === courseId)?.name ?? '';
  const cadetName = (cadetId: string) => {
    const cadet = records.cadets.find((item) => item.id === cadetId);
    return cadet ? `${cadet.firstName} ${cadet.lastName}` : '';
  };

  if (kind === 'progress') {
    const matched = records.cadets.filter((cadet) => !filters.status || cadet.status === filters.status);
    const rows = matched.map((cadet) => ({
      id: cadet.id,
      cells: [cadetName(cadet.id), `${progressPercent(state, cadet)}%`, cadet.status],
    }));
    return model(kind, ['Cadet', 'Progress', 'Status'], rows, records.cadets.length, [rowCard(rows.length)], barsFrom(matched.map((cadet) => cadet.status)));
  }

  if (kind === 'hours') {
    const completed = records.flights.filter((flight) => flight.status === 'Completed' && flight.actual);
    const matched = completed.filter((flight) => {
      if (!inRange(flight.date, filters.from, filters.to)) return false;
      if (filters.aircraftId && flight.aircraftId !== filters.aircraftId) return false;
      if (filters.instructorId && flight.instructorId !== filters.instructorId) return false;
      return true;
    });
    const rows = matched.map((flight) => ({
      id: flight.id,
      cells: [flight.reference, cadetName(flight.cadetId), String(flight.actual?.hours ?? '')],
    }));
    const hours = Math.round(matched.reduce((sum, flight) => sum + Number(flight.actual?.hours || 0), 0) * 10) / 10;
    return model(kind, ['Reference', 'Cadet', 'Hours'], rows, completed.length, [
      rowCard(rows.length),
      { label: 'Completed hours', value: String(hours), hint: 'Sum of completed flight hours in this list. Not a duty-time or authorisation total.' },
    ], barsFrom(matched.map((flight) => records.aircraft.find((item) => item.id === flight.aircraftId)?.code || 'Aircraft')));
  }

  if (kind === 'fleet') {
    const matched = records.aircraft.filter((aircraft) => !filters.status || aircraft.status === filters.status);
    const rows = matched.map((aircraft) => ({
      id: aircraft.id,
      cells: [aircraft.code, String(recordedAircraftHours(state, aircraft.id)), aircraft.status],
    }));
    return model(kind, ['Aircraft', 'Recorded hours', 'Status'], rows, records.aircraft.length, [
      rowCard(rows.length),
      { label: 'Planning status', value: 'Not a utilisation rate', hint: 'Recorded hours are opening hours plus completed flights. Aircraft status is a planning label, not a maintenance release.' },
    ], barsFrom(matched.map((aircraft) => aircraft.status)));
  }

  if (kind === 'fuel') {
    const matched = records.fuelTransactions.filter((tx) => {
      if (!inRange(tx.at, filters.from, filters.to)) return false;
      if (filters.fuelType && tx.type !== filters.fuelType) return false;
      return true;
    });
    const rows = matched.map((tx) => ({
      id: tx.id,
      cells: [formatDate(tx.at), tx.type, String(tx.quantity)],
    }));
    return model(kind, ['Date', 'Type', 'Quantity'], rows, records.fuelTransactions.length, [rowCard(rows.length)], barsFrom(matched.map((tx) => tx.type)));
  }

  if (kind === 'fees') {
    const matched = records.cadets.filter((cadet) => !filters.courseId || cadet.courseId === filters.courseId);
    const accounts = matched.map((cadet) => ({ cadet, fees: feeAccount(state, cadet) }));
    const rows = accounts.map(({ cadet, fees }) => ({
      id: cadet.id,
      cells: [cadetName(cadet.id), inr(fees.paid), inr(fees.outstanding)],
    }));
    const paid = accounts.reduce((sum, item) => sum + item.fees.paid, 0);
    const outstanding = accounts.reduce((sum, item) => sum + item.fees.outstanding, 0);
    return model(kind, ['Cadet', 'Paid', 'Outstanding'], rows, records.cadets.length, [
      { label: 'Paid', value: inr(paid), hint: 'Illustrative fee accounts in this list. Not revenue.' },
      { label: 'Outstanding', value: inr(outstanding), hint: 'Plan total minus that cadet’s payments. Not an accounting ledger.' },
    ], barsFrom(accounts.map((item) => (item.fees.overdue ? 'Overdue' : 'Not overdue'))));
  }

  if (kind === 'documents') {
    const matched = records.documents.filter((document) => !filters.review || document.review === filters.review);
    const rows = matched.map((document) => ({
      id: document.id,
      cells: [document.title, document.expires ? formatDate(document.expires) : '—', document.review],
    }));
    return model(kind, ['Document', 'Expires', 'Review'], rows, records.documents.length, [
      rowCard(rows.length),
      { label: 'Review label', value: 'Stored status only', hint: 'A review label is not a check that the file is authentic or regulator-verified. No file is stored.' },
    ], barsFrom(matched.map((document) => document.review)));
  }

  if (kind === 'audit') {
    const query = filters.search.trim().toLowerCase();
    const matched = records.audit.filter((event) => {
      if (!query) return true;
      return `${event.actor} ${event.action} ${event.summary}`.toLowerCase().includes(query);
    });
    const rows = matched.map((event) => ({
      id: event.id,
      cells: [event.at, event.actor, event.summary],
    }));
    return model(kind, ['When', 'Actor', 'Summary'], rows, records.audit.length, [rowCard(rows.length)], barsFrom(matched.map((event) => event.action)));
  }

  const matched = records.cadets.filter((cadet) => {
    if (filters.courseId && cadet.courseId !== filters.courseId) return false;
    if (filters.status && cadet.status !== filters.status) return false;
    return true;
  });
  const rows = matched.map((cadet) => ({
    id: cadet.id,
    cells: [cadet.code, cadetName(cadet.id), courseName(cadet.courseId), String(recordedCadetHours(state, cadet.id))],
  }));
  return model(kind, ['Code', 'Cadet', 'Course', 'Recorded hours'], rows, records.cadets.length, [
    rowCard(rows.length),
    { label: 'Recorded hours', value: 'Opening plus completed', hint: 'Each row uses opening hours plus completed flights. This is not a regulatory hour total.' },
  ], barsFrom(matched.map((cadet) => cadet.status)));
}

function model(
  kind: ReportKind,
  columns: string[],
  rows: ReportRow[],
  unfilteredCount: number,
  cards: ReportCard[],
  bars: ReportBar[],
): ReportModel {
  return { kind, columns, rows, unfilteredCount, cards, bars, note: REPORT_NOTE };
}

/** CSV of the filtered rows. A header row is included so the columns are named. The prototype export had no header. */
export function reportToCsv(report: ReportModel) {
  const line = (cells: string[]) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',');
  return [line(report.columns), ...report.rows.map((row) => line(row.cells))].join('\n');
}
