import { DEMO_TODAY } from './fixtures';
import { canUser, type RoleId } from './permissions';
import type {
  Aircraft,
  Cadet,
  Course,
  FeeAccount,
  FeePlan,
  Flight,
  ScheduleIssue,
  StaffMember,
  WorkspaceState,
} from './workspace';

/**
 * Port of `src/js/data/derive.js` and the dashboard hour total in `screen-ops.js`.
 * These are the HTML prototype's demonstration calculations, not academy policy.
 */

export type FlightScheduleInput = {
  date?: string;
  start?: string;
  end?: string;
  cadetId?: string;
  instructorId?: string;
  aircraftId?: string;
};

export type DashboardSummary = {
  operational: boolean;
  activeCadets: number;
  flightsToday: number;
  completedHoursThisMonth: number;
  availableAircraft: number;
  pendingApprovals: number;
  outstandingFees: number;
};

export function minutes(value: string | undefined) {
  const [hours, mins] = String(value || '0:0').split(':').map(Number);
  return (hours * 60) + mins;
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return minutes(startA) < minutes(endB) && minutes(startB) < minutes(endA);
}

export function dateInRange(date: string, from: string | undefined, until: string | undefined) {
  return Boolean(from && until && date >= from && date <= until);
}

export function fullName(cadet: Cadet | undefined) {
  return cadet ? `${cadet.firstName} ${cadet.lastName}` : 'Unknown cadet';
}

export function findById<T extends { id: string }>(list: readonly T[] | undefined, id: string | undefined) {
  return (list ?? []).find((item) => item.id === id);
}

export function courseOf(state: WorkspaceState, cadet: Cadet | undefined): Course | undefined {
  return findById(state.courses, cadet && cadet.courseId);
}

export function staffOf(state: WorkspaceState, id: string | undefined): StaffMember | undefined {
  return findById(state.staff, id);
}

export function aircraftOf(state: WorkspaceState, id: string | undefined): Aircraft | undefined {
  return findById(state.aircraft, id);
}

export function cadetOf(state: WorkspaceState, id: string | undefined): Cadet | undefined {
  return findById(state.cadets, id);
}

export function itemName(state: WorkspaceState, itemId: string) {
  for (const syllabus of state.syllabi) {
    for (const phase of syllabus.phases) {
      const item = phase.items.find((entry) => entry.id === itemId);
      if (item) return item.name;
    }
  }
  return 'Training item';
}

/** Illustrative item count against the course required count. Not a licence or course certificate. */
export function illustrativeProgress(completedRequired: number, requiredCount: number) {
  if (!requiredCount) return 0;
  return Math.round((Number(completedRequired) / requiredCount) * 100);
}

export function progressPercent(state: WorkspaceState, cadet: Cadet | undefined) {
  const course = courseOf(state, cadet);
  return illustrativeProgress(cadet ? cadet.completedRequired : 0, course ? course.requiredCount : 0);
}

export function recordedHoursForCadet(openingHours: number, flights: readonly Flight[], cadetId: string) {
  const flown = flights
    .filter((flight) => flight.cadetId === cadetId && flight.status === 'Completed' && flight.actual)
    .reduce((sum, flight) => sum + Number(flight.actual?.hours || 0), 0);
  return Math.round((openingHours + flown) * 10) / 10;
}

export function recordedCadetHours(state: WorkspaceState, cadetId: string) {
  const cadet = cadetOf(state, cadetId);
  return recordedHoursForCadet(cadet ? cadet.openingHours : 0, state.flights, cadetId);
}

export function recordedAircraftHours(state: WorkspaceState, aircraftId: string) {
  const aircraft = aircraftOf(state, aircraftId);
  const flown = state.flights
    .filter((flight) => flight.aircraftId === aircraftId && flight.status === 'Completed' && flight.actual)
    .reduce((sum, flight) => sum + Number(flight.actual?.hours || 0), 0);
  return Math.round(((aircraft ? aircraft.openingHours : 0) + flown) * 10) / 10;
}

export function feeAccount(state: WorkspaceState, cadet: Cadet): FeeAccount {
  const course = courseOf(state, cadet);
  const plan: FeePlan | undefined = state.feePlans.find((item) => item.courseId === (course && course.id));
  const total = plan ? plan.total : 0;
  const paid = state.payments
    .filter((payment) => payment.cadetId === cadet.id)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = Math.round((total - paid) * 100) / 100;
  return {
    plan,
    total,
    paid,
    outstanding,
    overdue: outstanding > 0 && Boolean(cadet.feeDueDate) && cadet.feeDueDate < DEMO_TODAY,
  };
}

export function fuelBalance(state: WorkspaceState, tankId: string) {
  return state.fuelTransactions
    .filter((tx) => tx.tankId === tankId)
    .reduce((sum, tx) => {
      if (tx.type === 'Receipt') return sum + Number(tx.quantity);
      if (tx.type === 'Issue') return sum - Number(tx.quantity);
      return sum + Number(tx.quantity);
    }, 0);
}

export function activeCadets(state: WorkspaceState) {
  return state.cadets.filter((cadet) => cadet.status === 'Active');
}

export function flightsOnDate(state: WorkspaceState, date: string) {
  return state.flights.filter((flight) => flight.date === date && flight.status !== 'Cancelled');
}

export function pendingApprovals(state: WorkspaceState) {
  return state.flights.filter((flight) => flight.status === 'Awaiting approval');
}

/** Port of the September completed-hours total in `renderDashboard`. The month prefix is the literal used there. */
export function completedHoursInSeptember(state: WorkspaceState) {
  return state.flights
    .filter((flight) => flight.status === 'Completed' && String(flight.date).startsWith('2026-09') && flight.actual)
    .reduce((sum, flight) => sum + Number(flight.actual?.hours || 0), 0);
}

export function outstandingFees(state: WorkspaceState) {
  return state.cadets.reduce((sum, cadet) => sum + feeAccount(state, cadet).outstanding, 0);
}

/** Totals from `renderFinance`. Collected is the sum of payment rows. Outstanding is summed per cadet account. */
export function financeSnapshot(state: WorkspaceState) {
  const billed = state.cadets.reduce((sum, cadet) => sum + feeAccount(state, cadet).total, 0);
  const collected = state.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const expenses = state.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  return {
    billed,
    collected,
    outstanding: outstandingFees(state),
    overdueAccounts: state.cadets.filter((cadet) => feeAccount(state, cadet).overdue).length,
    expenses,
  };
}

/**
 * Academy-wide counts kept for the original summary contract.
 * `operational` is true when the role has cadet view or flight view.
 * Role dashboards do not use this flag. Each card is gated by its own permission.
 */
export function dashboardSummary(state: WorkspaceState, user: { role: RoleId } | null): DashboardSummary {
  const operational = Boolean(user && (canUser(user.role, 'cadets.view') || canUser(user.role, 'flights.view')));
  if (!operational) {
    return {
      operational: false,
      activeCadets: 0,
      flightsToday: 0,
      completedHoursThisMonth: 0,
      availableAircraft: 0,
      pendingApprovals: 0,
      outstandingFees: 0,
    };
  }
  return {
    operational: true,
    activeCadets: activeCadets(state).length,
    flightsToday: flightsOnDate(state, DEMO_TODAY).length,
    completedHoursThisMonth: completedHoursInSeptember(state),
    availableAircraft: state.aircraft.filter((aircraft) => aircraft.status === 'Available').length,
    pendingApprovals: pendingApprovals(state).length,
    outstandingFees: outstandingFees(state),
  };
}

export function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function weekDates(anchor: string) {
  const date = new Date(`${anchor}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return isoDate(next);
  });
}

export function schedulingIssues(state: WorkspaceState, flight: FlightScheduleInput, ignoreId?: string): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  if (!flight.date || !flight.start || !flight.end || !flight.cadetId || !flight.instructorId || !flight.aircraftId) {
    return [{ level: 'blocker', resource: 'Form', message: 'Date, times, cadet, instructor, and aircraft are required.' }];
  }
  const date = flight.date;
  const start = flight.start;
  const end = flight.end;
  const cadetId = flight.cadetId;
  const instructorId = flight.instructorId;
  const aircraftId = flight.aircraftId;
  if (minutes(start) >= minutes(end)) {
    issues.push({ level: 'blocker', resource: 'Time', message: 'Start time must be earlier than end time.' });
  }

  const others = state.flights.filter((item) => item.id !== ignoreId && item.date === date && item.status !== 'Cancelled' && item.status !== 'Rejected');
  const clash = (resourceId: string, key: 'cadetId' | 'instructorId' | 'aircraftId', label: string) => {
    const hit = others.find((item) => item[key] === resourceId && rangesOverlap(start, end, item.start, item.end));
    if (hit) {
      issues.push({
        level: 'blocker',
        resource: label,
        message: `${label} overlaps ${hit.reference} (${hit.start}\u2013${hit.end}).`,
        conflictId: hit.id,
      });
    }
  };
  clash(cadetId, 'cadetId', 'Cadet');
  clash(instructorId, 'instructorId', 'Instructor');
  clash(aircraftId, 'aircraftId', 'Aircraft');

  state.availability
    .filter((block) => block.staffId === instructorId && block.date === date && rangesOverlap(start, end, block.start, block.end))
    .forEach((block) => {
      issues.push({ level: 'blocker', resource: 'Instructor', message: `Instructor is marked ${block.kind.toLowerCase()} ${block.start}\u2013${block.end}. ${block.reason}` });
    });

  const aircraft = aircraftOf(state, aircraftId);
  if (aircraft && aircraft.status !== 'Available') {
    issues.push({
      level: 'blocker',
      resource: 'Aircraft',
      message: `${aircraft.code} is recorded as ${aircraft.status}. This is a planning constraint, not a serviceability decision. ${aircraft.restriction ? aircraft.restriction.reason : ''}`,
    });
  } else if (aircraft && aircraft.restriction && dateInRange(date, aircraft.restriction.from, aircraft.restriction.until)) {
    issues.push({ level: 'blocker', resource: 'Aircraft', message: `${aircraft.code} has a planning restriction until ${aircraft.restriction.until}. ${aircraft.restriction.reason}` });
  }

  const instructor = staffOf(state, instructorId);
  if (instructor) {
    instructor.qualifications.forEach((qualification) => {
      if (qualification.expires && qualification.expires < date) {
        issues.push({ level: 'warning', resource: 'Qualification', message: `${qualification.name} is dated before this flight (${qualification.expires}). This is informational only.` });
      }
    });
  }
  return issues;
}

export function blockers(issues: ScheduleIssue[]) {
  return issues.filter((issue) => issue.level === 'blocker');
}

export function inr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export function formatDate(iso: string | undefined) {
  if (!iso) return '\u2014';
  const [year, month, day] = iso.slice(0, 10).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

export function weekday(iso: string) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(`${iso}T00:00:00`).getDay()];
}

export function visibleCadets(state: WorkspaceState, user: { role: RoleId; staffId?: string } | null) {
  if (user && user.role === 'instructor') {
    return state.cadets.filter((cadet) => cadet.instructorId === user.staffId);
  }
  return state.cadets;
}

export function isCadetVisible(cadet: Cadet, user: { role: RoleId; staffId?: string } | null) {
  return !(user && user.role === 'instructor' && cadet.instructorId !== user.staffId);
}

/** Same increment used by `saveAssessment` and `completeFlight` in the prototype store. */
export function recordSatisfactoryItem(state: WorkspaceState, cadet: Cadet, itemId: string | undefined) {
  if (!itemId || cadet.completedItemIds.includes(itemId)) return false;
  cadet.completedItemIds.push(itemId);
  const course = findById(state.courses, cadet.courseId);
  cadet.completedRequired = Math.min(course ? course.requiredCount : 100, Number(cadet.completedRequired) + 1);
  return true;
}

export function flightScheduleInput(flight: Flight): FlightScheduleInput {
  return {
    date: flight.date,
    start: flight.start,
    end: flight.end,
    cadetId: flight.cadetId,
    instructorId: flight.instructorId,
    aircraftId: flight.aircraftId,
  };
}
