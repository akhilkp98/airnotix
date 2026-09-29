import {
  blockers,
  aircraftOf,
  feeAccount,
  financeSnapshot,
  findById,
  itemName,
  progressPercent,
  recordedCadetHours,
  staffOf,
  fuelBalance,
  isCadetVisible,
  pendingApprovals,
  recordSatisfactoryItem,
  schedulingIssues,
  visibleCadets,
} from '../../domain/calculations';
import { SEED_VERSION, createWorkspaceFixture } from '../../domain/fixtures';
import { visibleNotifications } from '../../domain/notifications';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '../../domain/permissions';
import type { DemoUser } from '../../domain/demoData';
import type {
  AssessmentInput,
  AvailabilityInput,
  CadetInput,
  CadetLookup,
  DefectInput,
  AcademySettingsInput,
  ExpenseInput,
  Flight,
  FlightActualInput,
  FlightInput,
  FuelTransactionInput,
  MutationResult,
  PaymentInput,
  PortalSnapshot,
  SyllabusItemInput,
  UserInput,
  WorkspaceState,
} from '../../domain/workspace';

/** Literal used by the prototype `saveCadet` for a new cadet. Not a calculated due date. */
export const NEW_CADET_FEE_DUE_DATE = '2026-11-15';
/** Literal used by the prototype when enrolment does not choose an instructor. */
export const DEFAULT_NEW_CADET_INSTRUCTOR_ID = 'staff-arun';

/**
 * Port of the load, save, and commit flow in `src/js/data/store.js`.
 * The acting user is an argument because React sign-in stays in AuthProvider.
 * This store never reads or writes the HTML prototype key `airnotix-demo-v1`.
 */
export const WORKSPACE_STORAGE_KEY = 'airnotix-web-workspace-v1';
export const PROTOTYPE_STORAGE_KEY = 'airnotix-demo-v1';

export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function createMemoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stamp() {
  return new Date().toISOString();
}

function remember(
  state: WorkspaceState,
  actor: DemoUser | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  summary: string,
  reason?: string,
) {
  state.audit.unshift({
    id: `audit-${Date.now()}`,
    at: stamp(),
    actor: actor ? actor.name : 'Demo user',
    role: actor ? ROLE_LABELS[actor.role] : '',
    action,
    resourceType,
    resourceId,
    summary,
    reason: reason || '',
  });
}

function notify(state: WorkspaceState, notification: {
  title: string;
  body: string;
  href?: string;
  userId?: string;
  audienceRole?: string;
  category?: string;
}) {
  state.notifications.unshift({
    id: `nt-${Date.now()}`,
    read: false,
    at: stamp(),
    userId: '',
    audienceRole: '',
    category: 'Update',
    href: '',
    ...notification,
  });
}

function nextCode(state: WorkspaceState) {
  const numbers = state.cadets.map((cadet) => Number(cadet.code.slice(-3)) || 0);
  return `NFA-2026-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`;
}

function flightFrom(payload: FlightInput, existing: Flight | undefined): Flight {
  return {
    id: existing ? existing.id : `flt-${Date.now()}`,
    reference: existing ? existing.reference : `FLT-${2400 + Math.floor(Math.random() * 500)}`,
    date: payload.date ?? '',
    start: payload.start ?? '',
    end: payload.end ?? '',
    cadetId: payload.cadetId ?? '',
    itemId: payload.itemId ?? '',
    instructorId: payload.instructorId ?? '',
    aircraftId: payload.aircraftId ?? '',
    flightType: payload.flightType || 'Training',
    status: existing ? existing.status : 'Draft',
    notes: String(payload.notes || '').trim(),
    submittedBy: existing ? existing.submittedBy : '',
    approval: existing ? existing.approval : null,
    actual: existing ? existing.actual : null,
  };
}

export function createWorkspaceStore(storage: KeyValueStorage) {
  function load(): WorkspaceState {
    try {
      const raw = storage.getItem(WORKSPACE_STORAGE_KEY);
      if (!raw) return createWorkspaceFixture();
      const parsed = JSON.parse(raw) as WorkspaceState | null;
      if (!parsed || parsed.seedVersion !== SEED_VERSION) return createWorkspaceFixture();
      return parsed;
    } catch {
      return createWorkspaceFixture();
    }
  }

  function saveState(state: WorkspaceState) {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  }

  function commit<T extends MutationResult>(mutator: (state: WorkspaceState) => T): T {
    const next = clone(load());
    const result = mutator(next);
    if (result.ok === false) return result;
    saveState(next);
    return result;
  }

  function saveCadet(payload: CadetInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const firstName = String(payload.firstName || '').trim();
      const lastName = String(payload.lastName || '').trim();
      const email = String(payload.email || '').trim();
      if (!firstName || !lastName || !payload.courseId || !payload.joiningDate) {
        return { ok: false, error: 'First name, last name, course, and joining date are required.' };
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: 'Enter a valid email address, or leave it blank.' };
      }
      const course = findById(state.courses, payload.courseId);
      if (!course) return { ok: false, error: 'Choose a course from the demo list.' };
      if (payload.id) {
        const cadet = findById(state.cadets, payload.id);
        if (!cadet) return { ok: false, error: 'That cadet is no longer in the demo data.' };
        Object.assign(cadet, {
          firstName,
          lastName,
          email,
          phone: String(payload.phone || '').trim(),
          dob: payload.dob || '',
          courseId: course.id,
          syllabusId: course.syllabusId,
          batch: payload.batch || cadet.batch,
          joiningDate: payload.joiningDate,
          instructorId: payload.instructorId || cadet.instructorId,
        });
        remember(state, actor, 'Cadet updated', 'Cadet', cadet.id, `Updated ${firstName} ${lastName}.`);
        return { ok: true, id: cadet.id };
      }
      const cadet = {
        id: `cadet-${Date.now()}`,
        code: nextCode(state),
        firstName,
        lastName,
        email,
        phone: String(payload.phone || '').trim(),
        dob: payload.dob || '',
        courseId: course.id,
        syllabusId: course.syllabusId,
        batch: payload.batch || `${course.type}-2026-A`,
        joiningDate: payload.joiningDate,
        status: 'Active',
        openingHours: 0,
        completedRequired: 0,
        instructorId: payload.instructorId || DEFAULT_NEW_CADET_INSTRUCTOR_ID,
        feeDueDate: NEW_CADET_FEE_DUE_DATE,
        completedItemIds: [],
      };
      state.cadets.unshift(cadet);
      remember(state, actor, 'Cadet created', 'Cadet', cadet.id, `Enrolled ${firstName} ${lastName} on ${course.name}.`);
      return { ok: true, id: cadet.id };
    });
  }

  function setCadetStatus(id: string, status: string, reason: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const cadet = findById(state.cadets, id);
      if (!cadet) return { ok: false, error: 'Cadet not found.' };
      if (!reason || !String(reason).trim()) {
        return { ok: false, error: 'A reason is required for a status change.' };
      }
      cadet.status = status;
      remember(state, actor, 'Cadet status changed', 'Cadet', id, `${cadet.firstName} ${cadet.lastName} is now ${status}.`, reason);
      return { ok: true, id };
    });
  }

  function addSyllabusPhase(syllabusId: string, name: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const syllabus = findById(state.syllabi, syllabusId);
      if (!syllabus || syllabus.status === 'Published') {
        return { ok: false, error: 'Add phases to a draft syllabus. Published versions stay unchanged.' };
      }
      if (!String(name || '').trim()) return { ok: false, error: 'Phase name is required.' };
      syllabus.phases.push({ id: `ph-${Date.now()}`, name: String(name).trim(), items: [] });
      remember(state, actor, 'Syllabus phase added', 'Syllabus', syllabusId, `Added phase “${name.trim()}” to ${syllabus.label}.`);
      return { ok: true, id: syllabusId };
    });
  }

  function addSyllabusItem(syllabusId: string, phaseId: string, item: SyllabusItemInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const syllabus = findById(state.syllabi, syllabusId);
      const phase = syllabus && syllabus.phases.find((entry) => entry.id === phaseId);
      if (!syllabus || syllabus.status === 'Published' || !phase) {
        return { ok: false, error: 'Items can be added to a draft phase only.' };
      }
      const itemName = String(item.name || '').trim();
      if (!itemName) return { ok: false, error: 'Item name is required.' };
      phase.items.push({
        id: `item-${Date.now()}`,
        name: itemName,
        type: item.type || 'Flight exercise',
        required: item.required !== false,
      });
      remember(state, actor, 'Syllabus item added', 'Syllabus', syllabusId, `Added “${itemName}” to ${phase.name}.`);
      return { ok: true, id: syllabusId };
    });
  }

  function moveSyllabusItem(syllabusId: string, phaseId: string, itemId: string, direction: number): MutationResult {
    return commit((state) => {
      const syllabus = findById(state.syllabi, syllabusId);
      const phase = syllabus && syllabus.phases.find((entry) => entry.id === phaseId);
      if (!syllabus || !phase || syllabus.status === 'Published') {
        return { ok: false, error: 'Published syllabus order is fixed.' };
      }
      const index = phase.items.findIndex((item) => item.id === itemId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= phase.items.length) {
        return { ok: false, error: 'That item cannot move further.' };
      }
      const [item] = phase.items.splice(index, 1);
      if (!item) return { ok: false, error: 'That item cannot move further.' };
      phase.items.splice(target, 0, item);
      return { ok: true, id: syllabusId };
    });
  }

  function publishSyllabus(syllabusId: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const syllabus = findById(state.syllabi, syllabusId);
      if (!syllabus || syllabus.status !== 'Draft') {
        return { ok: false, error: 'Only a draft can be published.' };
      }
      if (!syllabus.phases.length) return { ok: false, error: 'Add at least one phase before publishing.' };
      state.syllabi.forEach((item) => {
        if (item.courseId === syllabus.courseId && item.status === 'Published') item.status = 'Archived';
      });
      syllabus.status = 'Published';
      const course = state.courses.find((item) => item.id === syllabus.courseId);
      if (course) course.syllabusId = syllabus.id;
      remember(state, actor, 'Syllabus published', 'Syllabus', syllabusId, `Published ${syllabus.label}. Existing cadet assignments are unchanged until a profile is updated.`);
      return { ok: true, id: syllabusId };
    });
  }

  function saveAssessment(payload: AssessmentInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const cadet = findById(state.cadets, payload.cadetId);
      if (!cadet || !payload.itemId || !payload.outcome) {
        return { ok: false, error: 'Cadet, training item, and outcome are required.' };
      }
      const assessment = {
        id: `ass-${Date.now()}`,
        cadetId: cadet.id,
        itemId: payload.itemId,
        outcome: payload.outcome,
        comments: String(payload.comments || '').trim(),
        date: payload.date || stamp().slice(0, 10),
        assessor: actor ? actor.name : 'Demo assessor',
      };
      state.assessments.unshift(assessment);
      if (payload.outcome === 'Satisfactory') recordSatisfactoryItem(state, cadet, payload.itemId);
      remember(state, actor, 'Assessment recorded', 'Cadet', cadet.id, `${assessment.outcome} recorded for ${cadet.firstName} ${cadet.lastName}.`, assessment.comments);
      return { ok: true, id: assessment.id };
    });
  }

  function saveFlight(payload: FlightInput, submit: boolean, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const existing = payload.id ? findById(state.flights, payload.id) : undefined;
      if (existing && existing.status !== 'Draft' && existing.status !== 'Rejected') {
        return { ok: false, error: 'Only a draft or rejected flight can be edited. Completed flights use a correction.' };
      }
      const draft = flightFrom(payload, existing);
      const issues = schedulingIssues(state, draft, draft.id);
      if (submit && blockers(issues).length) {
        return { ok: false, error: blockers(issues)[0].message, issues };
      }
      draft.status = submit ? 'Awaiting approval' : 'Draft';
      if (submit) {
        draft.submittedBy = actor ? actor.name : 'Demo user';
        draft.approval = null;
      }
      if (existing) Object.assign(existing, draft);
      else state.flights.push(draft);
      remember(state, actor, submit ? 'Flight submitted' : 'Flight draft saved', 'Flight', draft.id, `${draft.reference} ${draft.date} ${draft.start}\u2013${draft.end}.`);
      if (submit) {
        notify(state, { audienceRole: 'cfi', title: 'Flight awaiting approval', body: `${draft.reference} was submitted.`, href: `flight-operations.html?id=${draft.id}`, category: 'Approval' });
        notify(state, { audienceRole: 'academy-admin', title: 'Flight awaiting approval', body: `${draft.reference} was submitted.`, href: `flight-operations.html?id=${draft.id}`, category: 'Approval' });
      }
      return { ok: true, id: draft.id, issues };
    });
  }

  function decideFlight(id: string, decision: string, comment: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const flight = findById(state.flights, id);
      if (!flight || flight.status !== 'Awaiting approval') {
        return { ok: false, error: 'Only a flight awaiting approval can be decided.' };
      }
      if (!String(comment || '').trim()) return { ok: false, error: 'A comment is required.' };
      if (decision === 'Approved' && blockers(schedulingIssues(state, flight, flight.id)).length) {
        return { ok: false, error: 'Resolve the scheduling conflicts before approval.' };
      }
      flight.status = decision === 'Approved' ? 'Approved' : 'Rejected';
      flight.approval = {
        by: actor ? actor.name : 'Demo approver',
        at: stamp(),
        comment: comment.trim(),
        decision: flight.status,
      };
      remember(state, actor, decision === 'Approved' ? 'Flight approved' : 'Flight rejected', 'Flight', id, `${flight.reference} is ${flight.status}.`, comment.trim());
      const cadet = findById(state.cadets, flight.cadetId);
      const cadetUser = cadet && state.users.find((item) => item.cadetId === cadet.id);
      if (decision === 'Approved' && cadetUser) {
        notify(state, { userId: cadetUser.id, title: 'Flight approved', body: `${flight.reference} on ${flight.date} is approved.`, href: 'portal-schedule.html', category: 'Schedule' });
      }
      notify(state, { audienceRole: 'operations', title: `Flight ${flight.status.toLowerCase()}`, body: `${flight.reference}: ${comment.trim()}`, href: `flight-operations.html?id=${flight.id}`, category: 'Approval' });
      return { ok: true, id };
    });
  }

  function cancelFlight(id: string, reason: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const flight = findById(state.flights, id);
      if (!flight || flight.status === 'Completed' || flight.status === 'Cancelled') {
        return { ok: false, error: 'That flight cannot be cancelled.' };
      }
      if (!String(reason || '').trim()) return { ok: false, error: 'A reason is required.' };
      flight.status = 'Cancelled';
      remember(state, actor, 'Flight cancelled', 'Flight', id, `${flight.reference} was cancelled.`, reason.trim());
      return { ok: true, id };
    });
  }

  function completeFlight(id: string, actual: FlightActualInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const flight = findById(state.flights, id);
      if (!flight || flight.status !== 'Approved') {
        return { ok: false, error: 'Only an approved flight can be completed.' };
      }
      if (actor && actor.role === 'instructor' && actor.staffId !== flight.instructorId) {
        return { ok: false, error: 'Instructors can record completion only for their assigned flights.' };
      }
      const hours = Number(actual.hours);
      if (!actual.start || !actual.end || !hours || hours <= 0 || !actual.outcome) {
        return { ok: false, error: 'Actual times, hours, and an outcome are required.' };
      }
      flight.status = 'Completed';
      flight.actual = {
        start: actual.start,
        end: actual.end,
        hours,
        outcome: actual.outcome,
        comments: String(actual.comments || '').trim(),
        attendance: actual.attendance || 'Present',
        followUp: Boolean(actual.followUp),
        followUpNotes: String(actual.followUpNotes || '').trim(),
      };
      const cadet = findById(state.cadets, flight.cadetId);
      if (cadet && actual.outcome === 'Satisfactory') recordSatisfactoryItem(state, cadet, flight.itemId);
      remember(state, actor, 'Flight completed', 'Flight', id, `${flight.reference} recorded ${hours} hours. Outcome: ${actual.outcome}.`);
      notify(state, { audienceRole: 'operations', title: 'Flight completed', body: `${flight.reference} was recorded as completed.`, href: `flight-operations.html?id=${id}`, category: 'Flight' });
      return { ok: true, id };
    });
  }

  function correctFlight(id: string, hours: number | string, reason: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const flight = findById(state.flights, id);
      const nextHours = Number(hours);
      if (!flight || flight.status !== 'Completed' || !flight.actual) {
        return { ok: false, error: 'Only a completed flight can be corrected.' };
      }
      if (!nextHours || nextHours <= 0 || !String(reason || '').trim()) {
        return { ok: false, error: 'A revised hour value and a reason are required.' };
      }
      const previous = flight.actual.hours;
      flight.actual.hours = nextHours;
      remember(state, actor, 'Flight corrected', 'Flight', id, `${flight.reference} hours changed from ${previous} to ${nextHours}.`, reason.trim());
      return { ok: true, id };
    });
  }

  function addFuelTransaction(payload: FuelTransactionInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const tank = findById(state.tanks, payload.tankId);
      const quantity = Number(payload.quantity);
      if (!tank || !payload.type || !quantity) {
        return { ok: false, error: 'Tank, type, and quantity are required.' };
      }
      if (quantity <= 0 && payload.type !== 'Adjustment') {
        return { ok: false, error: 'Quantity must be greater than zero.' };
      }
      if (payload.type === 'Adjustment' && !String(payload.reason || '').trim()) {
        return { ok: false, error: 'An adjustment needs a reason.' };
      }
      const currentBalance = fuelBalance(state, tank.id);
      if (payload.type === 'Issue' && quantity > currentBalance) {
        return { ok: false, error: 'That issue is larger than the calculated stock.' };
      }
      state.fuelTransactions.unshift({
        id: `fuel-${Date.now()}`,
        tankId: tank.id,
        type: payload.type,
        quantity: payload.type === 'Adjustment' ? quantity : Math.abs(quantity),
        unitCost: Number(payload.unitCost) || 0,
        at: stamp(),
        reference: payload.reference || 'DEMO',
        notes: String(payload.notes || '').trim(),
        reason: String(payload.reason || '').trim(),
      });
      remember(state, actor, 'Fuel transaction recorded', 'Fuel', tank.id, `${payload.type} of ${quantity} ${tank.unit} on ${tank.name}.`, payload.reason || '');
      return { ok: true, id: tank.id };
    });
  }

  function setAircraftStatus(id: string, status: string, reason: string, until: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const aircraft = findById(state.aircraft, id);
      if (!aircraft) return { ok: false, error: 'Aircraft not found.' };
      if (status !== 'Available' && !String(reason || '').trim()) {
        return { ok: false, error: 'A reason is required when the aircraft is not available.' };
      }
      aircraft.status = status;
      aircraft.restriction = status === 'Available' ? null : {
        from: stamp().slice(0, 10),
        until: until || '2026-10-31',
        reason: String(reason || '').trim(),
      };
      remember(state, actor, 'Aircraft status changed', 'Aircraft', id, `${aircraft.code} is now ${status}.`, reason || '');
      return { ok: true };
    });
  }

  function addDefect(payload: DefectInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const aircraft = findById(state.aircraft, payload.aircraftId ?? '');
      if (!aircraft || !String(payload.description || '').trim()) {
        return { ok: false, error: 'Aircraft and description are required.' };
      }
      const description = String(payload.description).trim();
      const defect = {
        id: `def-${Date.now()}`,
        aircraftId: aircraft.id,
        reportedAt: stamp(),
        description,
        severity: payload.severity || 'Medium',
        reportedBy: actor ? actor.name : 'Demo user',
        status: 'Open',
      };
      state.defects.unshift(defect);
      state.workOrders.unshift({
        id: `wo-${Date.now()}`,
        reference: `WO-${Math.floor(2500 + Math.random() * 400)}`,
        aircraftId: aircraft.id,
        defectId: defect.id,
        assigneeId: 'staff-ravi',
        description,
        status: 'Open',
        notes: '',
        release: null,
      });
      remember(state, actor, 'Defect recorded', 'Aircraft', aircraft.id, `${aircraft.code}: ${description}`);
      notify(state, {
        audienceRole: 'maintenance',
        title: 'Defect recorded',
        body: `${aircraft.code} has a new demo defect.`,
        href: 'maintenance.html',
        category: 'Maintenance',
      });
      return { ok: true };
    });
  }

  function updateWorkOrder(id: string, status: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const order = findById(state.workOrders, id);
      if (!order) return { ok: false, error: 'Work order not found.' };
      order.status = status;
      remember(state, actor, 'Work order updated', 'Work order', id, `${order.reference} is now ${status}.`);
      return { ok: true };
    });
  }

  function recordRelease(id: string, note: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const order = findById(state.workOrders, id);
      if (!order) return { ok: false, error: 'Work order not found.' };
      if (!String(note || '').trim()) return { ok: false, error: 'Release notes are required.' };
      order.status = 'Release recorded';
      order.release = { by: actor ? actor.name : 'Demo user', at: stamp(), note: note.trim() };
      remember(state, actor, 'Authorized release recorded', 'Work order', id, `${order.reference}: authorized release recorded. This is not a system serviceability decision.`, note.trim());
      return { ok: true };
    });
  }

  function addAvailability(payload: AvailabilityInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      if (!payload.staffId || !payload.date || !payload.start || !payload.end) {
        return { ok: false, error: 'Staff member, date, and times are required.' };
      }
      const kind = payload.kind || 'Unavailable';
      state.availability.unshift({
        id: `avl-${Date.now()}`,
        staffId: payload.staffId,
        date: payload.date,
        start: payload.start,
        end: payload.end,
        kind,
        reason: String(payload.reason || 'Demo availability block').trim(),
      });
      const staff = findById(state.staff, payload.staffId);
      remember(state, actor, 'Availability updated', 'Staff', payload.staffId, `${staff ? staff.name : 'Staff'} marked ${kind} on ${payload.date}.`);
      return { ok: true };
    });
  }

  function addPayment(payload: PaymentInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const cadet = findById(state.cadets, payload.cadetId ?? '');
      const amount = Number(payload.amount);
      if (!cadet || !amount || amount <= 0 || !payload.date || !payload.method) {
        return { ok: false, error: 'Cadet, amount, date, and method are required.' };
      }
      state.payments.unshift({
        id: `pay-${Date.now()}`,
        cadetId: cadet.id,
        amount,
        date: payload.date,
        method: payload.method,
        reference: payload.reference || 'DEMO',
      });
      remember(state, actor, 'Payment recorded', 'Cadet', cadet.id, `${cadet.firstName} ${cadet.lastName} payment of ${amount} INR recorded.`);
      return { ok: true, id: cadet.id };
    });
  }

  function addExpense(payload: ExpenseInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const amount = Number(payload.amount);
      if (!payload.date || !payload.category || !String(payload.description || '').trim() || !amount || amount <= 0) {
        return { ok: false, error: 'Date, category, description, and amount are required.' };
      }
      const description = String(payload.description).trim();
      state.expenses.unshift({
        id: `exp-${Date.now()}`,
        date: payload.date,
        category: payload.category,
        description,
        amount,
        branch: 'Kochi Training Base',
        status: 'Recorded',
      });
      remember(state, actor, 'Expense recorded', 'Finance', payload.category, `${payload.category}: ${description}.`);
      return { ok: true };
    });
  }

  function reviewDocument(id: string, review: string, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const document = findById(state.documents, id);
      if (!document) return { ok: false, error: 'Document not found.' };
      document.review = review;
      remember(state, actor, 'Document reviewed', 'Document', id, `${document.title} marked ${review}.`);
      return { ok: true };
    });
  }

  function saveAcademySettings(payload: AcademySettingsInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      if (!String(payload.name || '').trim()) {
        return { ok: false, error: 'Academy name is required.' };
      }
      state.academy.name = String(payload.name).trim();
      state.academy.currency = payload.currency || 'INR';
      state.academy.timeZone = payload.timeZone || state.academy.timeZone;
      remember(state, actor, 'Settings updated', 'Academy', 'academy', 'Academy profile updated for future demo records.');
      return { ok: true };
    });
  }

  function addUser(payload: UserInput, actor?: DemoUser): MutationResult {
    return commit((state) => {
      const name = String(payload.name || '').trim();
      const email = String(payload.email || '').trim().toLowerCase();
      if (!name || !email || !payload.role || !ROLE_PERMISSIONS[payload.role as keyof typeof ROLE_PERMISSIONS]) {
        return { ok: false, error: 'Name, email, and role are required.' };
      }
      if (state.users.some((user) => user.email.toLowerCase() === email)) {
        return { ok: false, error: 'That email is already a demo user.' };
      }
      const role = payload.role as keyof typeof ROLE_PERMISSIONS;
      const user = { id: `user-${Date.now()}`, name, email, role };
      state.users.push(user);
      remember(state, actor, 'User added', 'User', user.id, `${name} added as ${ROLE_LABELS[role]}.`);
      return { ok: true, id: user.id };
    });
  }

  function markNotificationRead(id: string): MutationResult {
    return commit((state) => {
      const notification = findById(state.notifications, id);
      if (notification) notification.read = true;
      return { ok: true };
    });
  }

  function markAllNotificationsRead(actor?: DemoUser): MutationResult {
    return commit((state) => {
      state.notifications.forEach((notification) => {
        const mine = notification.userId === (actor && actor.id) || notification.audienceRole === (actor && actor.role);
        if (mine) notification.read = true;
      });
      return { ok: true };
    });
  }

  return {
    load,
    saveState,
    listCadets(user: DemoUser | null) {
      return visibleCadets(load(), user);
    },
    listCadetLabels() {
      return load().cadets.map((cadet) => ({ id: cadet.id, name: `${cadet.firstName} ${cadet.lastName}` }));
    },
    getCadet(id: string, user: DemoUser | null) {
      const cadet = findById(load().cadets, id);
      if (!cadet || !isCadetVisible(cadet, user)) return null;
      return cadet;
    },
    lookupCadet(id: string, user: DemoUser | null): CadetLookup {
      const cadet = findById(load().cadets, id);
      if (!cadet) return { status: 'missing' };
      if (!isCadetVisible(cadet, user)) return { status: 'denied' };
      return { status: 'found', cadet };
    },
    listCourses: () => load().courses,
    listSyllabi: () => load().syllabi,
    listAssessments: () => load().assessments,
    listFlights: () => load().flights,
    listPendingApprovals: () => pendingApprovals(load()),
    listRecordedDecisions() {
      return load().flights.filter((flight) => flight.approval && flight.status !== 'Awaiting approval');
    },
    getFlight(id: string) {
      return findById(load().flights, id) ?? null;
    },
    listAircraft: () => load().aircraft,
    getAircraft(id: string) {
      return findById(load().aircraft, id) ?? null;
    },
    setAircraftStatus,
    listDefects: () => load().defects,
    listWorkOrders: () => load().workOrders,
    addDefect,
    updateWorkOrder,
    recordRelease,
    listStaff: () => load().staff,
    getStaff(id: string) {
      return findById(load().staff, id) ?? null;
    },
    listAvailability: () => load().availability,
    addAvailability,
    schedulingIssues(flight: FlightInput, ignoreId?: string) {
      return schedulingIssues(load(), flight, ignoreId);
    },
    listTanks: () => load().tanks,
    listFuelTransactions: () => load().fuelTransactions,
    fuelBalance(tankId: string) {
      return fuelBalance(load(), tankId);
    },
    listFeePlans: () => load().feePlans,
    listPayments: () => load().payments,
    listExpenses: () => load().expenses,
    financeSnapshot() {
      return financeSnapshot(load());
    },
    listFeeAccounts(user: DemoUser | null) {
      const state = load();
      return visibleCadets(state, user).map((cadet) => {
        const fees = feeAccount(state, cadet);
        return {
          cadetId: cadet.id,
          code: cadet.code,
          name: `${cadet.firstName} ${cadet.lastName}`,
          planName: fees.plan ? fees.plan.name : '',
          paid: fees.paid,
          outstanding: fees.outstanding,
          overdue: fees.overdue,
        };
      });
    },
    addPayment,
    addExpense,
    listDocuments: () => load().documents,
    reviewDocument,
    listNotifications(user: DemoUser | null) {
      return visibleNotifications(load().notifications, user);
    },
    markNotificationRead,
    markAllNotificationsRead,
    listAudit: () => load().audit,
    reportRecords() {
      const state = load();
      return {
        cadets: state.cadets,
        courses: state.courses,
        flights: state.flights,
        aircraft: state.aircraft,
        staff: state.staff,
        fuelTransactions: state.fuelTransactions,
        documents: state.documents,
        payments: state.payments,
        feePlans: state.feePlans,
        audit: state.audit,
      };
    },
    saveAcademySettings,
    addUser,
    portalHome(user: DemoUser | null): PortalSnapshot | null {
      if (!user?.cadetId) return null;
      const state = load();
      const cadet = findById(state.cadets, user.cadetId);
      if (!cadet) return null;
      const course = findById(state.courses, cadet.courseId);
      const syllabus = findById(state.syllabi, cadet.syllabusId);
      const fees = feeAccount(state, cadet);
      return {
        code: cadet.code,
        firstName: cadet.firstName,
        lastName: cadet.lastName,
        email: cadet.email,
        phone: cadet.phone,
        batch: cadet.batch,
        joiningDate: cadet.joiningDate,
        status: cadet.status,
        feeDueDate: cadet.feeDueDate,
        courseName: course?.name ?? '',
        courseStatus: course?.status ?? '',
        syllabusLabel: syllabus?.label ?? '',
        syllabusStatus: syllabus?.status ?? '',
        phases: (syllabus?.phases ?? []).map((phase) => ({
          id: phase.id,
          name: phase.name,
          items: phase.items.map((item) => ({
            id: item.id,
            name: item.name,
            recorded: cadet.completedItemIds.includes(item.id),
          })),
        })),
        progressPercent: progressPercent(state, cadet),
        recordedHours: recordedCadetHours(state, cadet.id),
        flights: state.flights
          .filter((flight) => flight.cadetId === cadet.id && (flight.status === 'Approved' || flight.status === 'Completed'))
          .map((flight) => ({
            id: flight.id,
            reference: flight.reference,
            date: flight.date,
            start: flight.start,
            end: flight.end,
            status: flight.status,
            aircraftCode: aircraftOf(state, flight.aircraftId)?.code ?? '',
            instructorName: staffOf(state, flight.instructorId)?.name ?? '',
            hours: flight.status === 'Completed' && flight.actual ? Number(flight.actual.hours) : null,
          })),
        documents: state.documents
          .filter((document) => document.ownerId === cadet.id)
          .map((document) => ({
            id: document.id,
            title: document.title,
            category: document.category,
            uploaded: document.uploaded,
            expires: document.expires,
            review: document.review,
          })),
        payments: state.payments
          .filter((payment) => payment.cadetId === cadet.id)
          .map((payment) => ({
            id: payment.id,
            amount: payment.amount,
            date: payment.date,
            method: payment.method,
            reference: payment.reference,
          })),
        planName: fees.plan?.name ?? '',
        billed: fees.total,
        paid: fees.paid,
        outstanding: fees.outstanding,
        overdue: fees.overdue,
        assessments: state.assessments
          .filter((assessment) => assessment.cadetId === cadet.id)
          .map((assessment) => ({
            id: assessment.id,
            itemName: itemName(state, assessment.itemId),
            outcome: assessment.outcome,
            date: assessment.date,
            assessor: assessment.assessor,
          })),
        notifications: state.notifications
          .filter((item) => item.userId === user.id)
          .map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            href: item.href,
            read: item.read,
            at: item.at,
          })),
      };
    },
    feeAccount(cadetId: string) {
      const state = load();
      const cadet = findById(state.cadets, cadetId);
      return cadet ? feeAccount(state, cadet) : null;
    },
    saveCadet,
    setCadetStatus,
    addSyllabusPhase,
    addSyllabusItem,
    moveSyllabusItem,
    publishSyllabus,
    saveAssessment,
    saveFlightDraft(payload: FlightInput, actor?: DemoUser) {
      return saveFlight(payload, false, actor);
    },
    submitFlight(payload: FlightInput, actor?: DemoUser) {
      return saveFlight(payload, true, actor);
    },
    decideFlight,
    cancelFlight,
    completeFlight,
    correctFlight,
    addFuelTransaction,
  };
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
