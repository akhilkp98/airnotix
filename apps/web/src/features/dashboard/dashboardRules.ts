import { DEMO_TODAY } from '../../domain/fixtures';
import { illustrativeProgress, recordedHoursForCadet } from '../../domain/calculations';
import { notificationRoute } from '../../domain/notifications';
import { ROLE_LABELS, type Permission, type RoleId } from '../../domain/permissions';
import { isLowStock } from '../fuel/fuelRules';
import { openDefects, openWorkOrders } from '../maintenance/maintenanceRules';
import { qualificationBeforeDemoDay } from '../staff/staffRules';
import type {
  AcademyDocument,
  Aircraft,
  Assessment,
  AvailabilityBlock,
  Cadet,
  Course,
  Defect,
  FeeAccountRow,
  Flight,
  FuelTank,
  ScheduleIssue,
  StaffMember,
  WorkOrder,
} from '../../domain/workspace';
import type { DemoUser } from '../../domain/demoData';

export type FlightLine = {
  id: string;
  reference: string;
  date: string;
  start: string;
  end: string;
  status: string;
  cadetName: string;
  instructorName: string;
  aircraftId: string;
  aircraftCode: string;
};

export type FlightIssueLine = FlightLine & {
  level: ScheduleIssue['level'];
  message: string;
};

export type CadetProgressLine = {
  id: string;
  name: string;
  status: string;
  progress: number;
  hours: number;
};

const closedFlight = new Set(['Cancelled', 'Completed', 'Rejected']);

export function flightsOnDemoDay(flights: readonly Flight[]) {
  return flights.filter((flight) => flight.date === DEMO_TODAY && flight.status !== 'Cancelled');
}

export function draftFlights(flights: readonly Flight[]) {
  return flights.filter((flight) => flight.status === 'Draft');
}

export function upcomingApprovedFlights(flights: readonly Flight[]) {
  return flights.filter((flight) => flight.status === 'Approved' && flight.date >= DEMO_TODAY);
}

export function instructorUpcomingFlights(flights: readonly Flight[], staffId: string) {
  return flights.filter((flight) => (
    flight.instructorId === staffId
    && flight.date >= DEMO_TODAY
    && !closedFlight.has(flight.status)
  ));
}

export function followUpFlights(flights: readonly Flight[], staffId: string) {
  return flights.filter((flight) => (
    flight.instructorId === staffId
    && flight.status === 'Completed'
    && flight.actual?.followUp === true
  ));
}

export function countStatus<T extends { status: string }>(items: readonly T[], status: string) {
  return items.filter((item) => item.status === status).length;
}

export const CADET_OUTSIDE_ASSIGNMENT = 'Cadet outside assigned list';

export function cadetDisplayName(
  cadet: { firstName?: string; lastName?: string; name?: string } | undefined,
  missing: string,
) {
  if (!cadet) return missing;
  if (cadet.name?.trim()) return cadet.name.trim();
  const name = `${cadet.firstName ?? ''} ${cadet.lastName ?? ''}`.trim();
  return name || missing;
}

export function countLabels(labels: readonly string[]) {
  const order: string[] = [];
  const counts = new Map<string, number>();
  labels.forEach((label) => {
    if (!counts.has(label)) order.push(label);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return order.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

export function statusBreakdown<T extends { status: string }>(items: readonly T[]) {
  return countLabels(items.map((item) => item.status));
}

export function availableAircraft(aircraft: readonly Aircraft[]) {
  return aircraft.filter((item) => item.status === 'Available');
}

export function aircraftNotAvailable(aircraft: readonly Aircraft[]) {
  return aircraft.filter((item) => item.status !== 'Available');
}

export function pendingDocuments(documents: readonly AcademyDocument[]) {
  return documents.filter((item) => item.review === 'Pending');
}

export function documentsForOwner(documents: readonly AcademyDocument[], ownerType: string) {
  return documents.filter((item) => item.ownerType === ownerType);
}

export function unreadNotifications<T extends { read: boolean }>(notes: readonly T[]) {
  return notes.filter((item) => !item.read);
}

export function lowFuelTanks(tanks: readonly FuelTank[], balances: Readonly<Record<string, number>>) {
  return tanks.filter((tank) => isLowStock(balances[tank.id] ?? 0, tank.threshold));
}

export function upcomingAvailability(blocks: readonly AvailabilityBlock[]) {
  return blocks.filter((block) => block.date >= DEMO_TODAY);
}

export function blocksOfKind(blocks: readonly AvailabilityBlock[], kind: string) {
  return blocks.filter((block) => block.kind === kind);
}

export function qualificationAttention(staff: readonly StaffMember[]) {
  return staff.filter((member) => qualificationBeforeDemoDay(member.qualifications[0]?.expires ?? ''));
}

export function assignedActiveCadets(cadets: readonly Cadet[]) {
  return cadets.filter((cadet) => cadet.status === 'Active');
}

export function cadetProgressLines(cadets: readonly Cadet[], courses: readonly Course[], flights: readonly Flight[]): CadetProgressLine[] {
  return cadets.map((cadet) => {
    const course = courses.find((item) => item.id === cadet.courseId);
    return {
      id: cadet.id,
      name: `${cadet.firstName} ${cadet.lastName}`,
      status: cadet.status,
      progress: illustrativeProgress(cadet.completedRequired, course ? course.requiredCount : 0),
      hours: recordedHoursForCadet(cadet.openingHours, flights, cadet.id),
    };
  });
}

export function flightLines(
  flights: readonly Flight[],
  cadetName: (id: string) => string,
  instructorName: (id: string) => string,
  aircraftCode: (id: string) => string,
): FlightLine[] {
  return flights.map((flight) => ({
    id: flight.id,
    reference: flight.reference,
    date: flight.date,
    start: flight.start,
    end: flight.end,
    status: flight.status,
    cadetName: cadetName(flight.cadetId),
    instructorName: instructorName(flight.instructorId),
    aircraftId: flight.aircraftId,
    aircraftCode: aircraftCode(flight.aircraftId),
  }));
}

export function usersByRole(users: readonly DemoUser[]) {
  return (Object.keys(ROLE_LABELS) as RoleId[]).map((role) => ({
    role,
    label: ROLE_LABELS[role],
    count: users.filter((user) => user.role === role).length,
  }));
}

export function overdueFirst(accounts: readonly FeeAccountRow[]) {
  return [...accounts].sort((left, right) => Number(right.overdue) - Number(left.overdue) || right.outstanding - left.outstanding);
}

export function recentByDate<T extends { date: string }>(rows: readonly T[], limit = 5) {
  return [...rows].sort((left, right) => right.date.localeCompare(left.date)).slice(0, limit);
}

export function workOrdersForAssignee(orders: readonly WorkOrder[], staffId: string) {
  return openWorkOrders([...orders]).filter((order) => order.assigneeId === staffId);
}

export function openDefectList(defects: readonly Defect[]) {
  return openDefects([...defects]);
}

export function notificationPath(href: string, can: (permission: Permission) => boolean) {
  const path = notificationRoute(href);
  if (!path) return null;
  if (path.startsWith('/approvals') && !can('approvals.view')) return null;
  if (path.startsWith('/finance') && !can('finance.view')) return null;
  if (path.startsWith('/maintenance') && !can('maintenance.view')) return null;
  if (path.startsWith('/flight-operations') && !can('flights.view')) return null;
  if (path.startsWith('/documents') && !can('documents.view')) return null;
  if (path.startsWith('/cadets') && !can('cadets.view')) return null;
  if (path.startsWith('/portal') && !can('portal.view')) return null;
  return path;
}

export function watchFlights(flights: readonly Flight[]) {
  const watched = new Map<string, Flight>();
  [...draftFlights(flights), ...flightsOnDemoDay(flights)].forEach((flight) => watched.set(flight.id, flight));
  return [...watched.values()];
}

export type AssessmentLine = {
  id: string;
  cadetName: string;
  itemName: string;
  outcome: string;
  date: string;
  assessor: string;
};

export function assessmentLines(
  assessments: readonly Assessment[],
  cadetName: (id: string) => string,
  itemName: (id: string) => string,
): AssessmentLine[] {
  return [...assessments]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((item) => ({
      id: item.id,
      cadetName: cadetName(item.cadetId),
      itemName: itemName(item.itemId),
      outcome: item.outcome,
      date: item.date,
      assessor: item.assessor,
    }));
}
