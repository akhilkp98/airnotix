import { describe, expect, it } from 'vitest';
import { recordedCadetHours } from '../../domain/calculations';
import { findDemoUser, SESSION_STORAGE_KEY, type DemoUser } from '../../domain/demoData';
import type { Flight } from '../../domain/workspace';
import { createMockWorkspaceRepository } from './mockWorkspaceRepository';
import {
  PROTOTYPE_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  createMemoryStorage,
  createWorkspaceStore,
  type KeyValueStorage,
} from './workspaceStore';

function actor(id: string): DemoUser {
  const user = findDemoUser(id);
  if (!user) throw new Error(id);
  return user;
}

function fresh() {
  return createWorkspaceStore(createMemoryStorage());
}

function flightInput(flight: Flight) {
  return {
    id: flight.id,
    date: flight.date,
    start: flight.start,
    end: flight.end,
    cadetId: flight.cadetId,
    itemId: flight.itemId,
    instructorId: flight.instructorId,
    aircraftId: flight.aircraftId,
    flightType: flight.flightType,
    notes: flight.notes,
  };
}

describe('workspace store rules from the HTML prototype', () => {
  it('stores the workspace on its own key', () => {
    const seen: string[] = [];
    const memory = createMemoryStorage();
    const storage: KeyValueStorage = {
      getItem(key) {
        seen.push(key);
        return memory.getItem(key);
      },
      setItem(key, value) {
        seen.push(key);
        memory.setItem(key, value);
      },
    };
    const store = createWorkspaceStore(storage);
    store.saveState(store.load());
    expect(seen.every((key) => key === WORKSPACE_STORAGE_KEY)).toBe(true);
    expect(memory.getItem(PROTOTYPE_STORAGE_KEY)).toBeNull();
    expect(memory.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(WORKSPACE_STORAGE_KEY).not.toBe(PROTOTYPE_STORAGE_KEY);
  });

  it('reloads the fixture when the saved seed version does not match', () => {
    const storage = createMemoryStorage();
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ seedVersion: 0, cadets: [] }));
    const store = createWorkspaceStore(storage);
    expect(store.load().cadets).toHaveLength(8);
    storage.setItem(WORKSPACE_STORAGE_KEY, '{');
    expect(store.load().flights).toHaveLength(9);
  });

  it('saves a conflicting draft and refuses submit without changing status', () => {
    const store = fresh();
    const before = store.getFlight('flt-2405');
    if (!before) throw new Error('missing draft');
    const submitted = store.submitFlight({ ...flightInput(before), notes: 'should not stick' }, actor('user-ops'));
    expect(submitted.ok).toBe(false);
    if (submitted.ok) return;
    expect(submitted.error).toBe('Instructor overlaps FLT-2404 (09:00\u201311:00).');
    expect(submitted.issues?.some((issue) => issue.conflictId === 'flt-2404')).toBe(true);
    expect(store.getFlight('flt-2405')).toMatchObject({ status: 'Draft', notes: before.notes });

    const saved = store.saveFlightDraft(flightInput(before), actor('user-ops'));
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.issues?.some((issue) => issue.level === 'blocker')).toBe(true);
    expect(store.getFlight('flt-2405')?.status).toBe('Draft');
  });

  it('refuses approval while blockers remain and still allows rejection', () => {
    const store = fresh();
    expect(store.decideFlight('flt-2405', 'Approved', 'Try the draft', actor('user-cfi')).ok).toBe(false);

    const state = store.load();
    const draft = state.flights.find((item) => item.id === 'flt-2405');
    if (!draft) throw new Error('missing draft');
    draft.status = 'Awaiting approval';
    store.saveState(state);

    const approved = store.decideFlight('flt-2405', 'Approved', 'Still overlapping', actor('user-cfi'));
    expect(approved).toEqual({ ok: false, error: 'Resolve the scheduling conflicts before approval.' });
    expect(store.getFlight('flt-2405')?.status).toBe('Awaiting approval');

    expect(store.decideFlight('flt-2405', 'Rejected', '   ', actor('user-cfi')).ok).toBe(false);
    const rejected = store.decideFlight('flt-2405', 'Rejected', 'Overlap remains', actor('user-cfi'));
    expect(rejected.ok).toBe(true);
    expect(store.getFlight('flt-2405')?.status).toBe('Rejected');
  });

  it('approves a flight whose only issue is a qualification warning', () => {
    const store = fresh();
    const result = store.decideFlight('flt-2403', 'Approved', 'Warning only', actor('user-cfi'));
    expect(result.ok).toBe(true);
    expect(store.getFlight('flt-2403')?.status).toBe('Approved');
  });

  it('refuses an issue above the calculated stock and accepts one equal to it', () => {
    const refused = fresh();
    const tooLarge = refused.addFuelTransaction({ tankId: 'tank-avgas', type: 'Issue', quantity: 4701 }, actor('user-ops'));
    expect(tooLarge).toEqual({ ok: false, error: 'That issue is larger than the calculated stock.' });
    expect(refused.fuelBalance('tank-avgas')).toBe(4700);
    expect(refused.listFuelTransactions()).toHaveLength(5);

    const exact = fresh();
    expect(exact.addFuelTransaction({ tankId: 'tank-avgas', type: 'Issue', quantity: 4700 }, actor('user-ops')).ok).toBe(true);
    expect(exact.fuelBalance('tank-avgas')).toBe(0);

    const adjustment = fresh();
    expect(adjustment.addFuelTransaction({ tankId: 'tank-avgas', type: 'Adjustment', quantity: -50 }, actor('user-ops')).ok).toBe(false);
    expect(adjustment.addFuelTransaction({
      tankId: 'tank-avgas',
      type: 'Adjustment',
      quantity: -50,
      reason: 'Demo dip',
    }, actor('user-ops')).ok).toBe(true);
    expect(adjustment.fuelBalance('tank-avgas')).toBe(4650);
    expect(adjustment.fuelBalance('tank-jeta')).toBe(1800);
  });

  it('increments illustrative progress once for a satisfactory item', () => {
    const store = fresh();
    const before = store.getCadet('cadet-aarav', null)?.completedRequired;
    expect(store.saveAssessment({ cadetId: 'cadet-aarav', itemId: 'item-stall', outcome: 'Satisfactory' }, actor('user-cfi')).ok).toBe(true);
    expect(store.getCadet('cadet-aarav', null)?.completedRequired).toBe((before ?? 0) + 1);
    expect(store.saveAssessment({ cadetId: 'cadet-aarav', itemId: 'item-stall', outcome: 'Satisfactory' }, actor('user-cfi')).ok).toBe(true);
    expect(store.getCadet('cadet-aarav', null)?.completedRequired).toBe((before ?? 0) + 1);

    const sara = store.getCadet('cadet-sara', null)?.completedRequired;
    store.saveAssessment({ cadetId: 'cadet-sara', itemId: 'item-stall', outcome: 'Further Training Required' }, actor('user-cfi'));
    expect(store.getCadet('cadet-sara', null)?.completedRequired).toBe(sara);

    store.saveAssessment({ cadetId: 'cadet-neil', itemId: 'item-stall', outcome: 'Satisfactory' }, actor('user-cfi'));
    const neil = store.getCadet('cadet-neil', null);
    expect(neil?.completedRequired).toBe(100);
    expect(neil?.completedItemIds).toContain('item-stall');
  });

  it('adds completion hours once and limits instructors to assigned flights', () => {
    const store = fresh();
    const denied = store.completeFlight('flt-2402', {
      start: '08:30',
      end: '10:30',
      hours: 2,
      outcome: 'Satisfactory',
    }, actor('user-arun'));
    expect(denied).toEqual({ ok: false, error: 'Instructors can record completion only for their assigned flights.' });
    expect(store.getFlight('flt-2402')?.status).toBe('Approved');

    expect(store.completeFlight('flt-2401', {
      start: '06:30',
      end: '08:00',
      hours: 0,
      outcome: 'Satisfactory',
    }, actor('user-arun')).ok).toBe(false);

    expect(store.completeFlight('flt-2401', {
      start: '06:30',
      end: '08:00',
      hours: 1.5,
      outcome: 'Satisfactory',
    }, actor('user-arun')).ok).toBe(true);
    expect(recordedCadetHours(store.load(), 'cadet-aarav')).toBe(31.3);
    expect(store.getCadet('cadet-aarav', null)?.completedRequired).toBe(37);

    expect(store.saveAssessment({ cadetId: 'cadet-aarav', itemId: 'item-circuits', outcome: 'Satisfactory' }, actor('user-cfi')).ok).toBe(true);
    expect(store.getCadet('cadet-aarav', null)?.completedRequired).toBe(37);
  });

  it('keeps the prototype enrolment defaults, including the hardcoded fee date', () => {
    const store = fresh();
    expect(store.saveCadet({ lastName: 'Cadet', courseId: 'course-ppl', joiningDate: '2026-09-29' }, actor('user-admin')).ok).toBe(false);
    expect(store.listCadets(null)).toHaveLength(8);

    const saved = store.saveCadet({
      firstName: 'New',
      lastName: 'Cadet',
      courseId: 'course-ppl',
      joiningDate: '2026-09-29',
    }, actor('user-admin'));
    expect(saved.ok).toBe(true);
    if (!saved.ok || !saved.id) return;
    expect(store.getCadet(saved.id, null)).toMatchObject({
      code: 'NFA-2026-009',
      status: 'Active',
      feeDueDate: '2026-11-15',
      openingHours: 0,
      completedRequired: 0,
      syllabusId: 'syl-ppl-1',
      instructorId: 'staff-arun',
    });
  });

  it('publishes a draft without rewriting cadet syllabus ids', () => {
    const store = fresh();
    expect(store.publishSyllabus('syl-cpl-draft', actor('user-cfi')).ok).toBe(false);
    expect(store.addSyllabusPhase('syl-cpl-1', 'Should fail', actor('user-cfi')).ok).toBe(false);
    expect(store.addSyllabusPhase('syl-cpl-draft', 'Demo phase', actor('user-cfi')).ok).toBe(true);
    const phaseId = store.listSyllabi().find((item) => item.id === 'syl-cpl-draft')?.phases[0]?.id;
    if (!phaseId) throw new Error('missing phase');
    expect(store.addSyllabusItem('syl-cpl-draft', phaseId, { name: 'Demo item' }, actor('user-cfi')).ok).toBe(true);
    expect(store.publishSyllabus('syl-cpl-draft', actor('user-cfi')).ok).toBe(true);
    const state = store.load();
    expect(state.syllabi.find((item) => item.id === 'syl-cpl-1')?.status).toBe('Archived');
    expect(state.courses.find((item) => item.id === 'course-cpl')?.syllabusId).toBe('syl-cpl-draft');
    expect(state.cadets.find((item) => item.id === 'cadet-aarav')?.syllabusId).toBe('syl-cpl-1');
  });
});

describe('workspace repository reads', () => {
  it('returns the typed fixture without using the prototype storage key', async () => {
    const store = fresh();
    const repository = createMockWorkspaceRepository({ store, wait: async () => {} });
    const admin = actor('user-admin');
    const arun = actor('user-arun');

    expect((await repository.getAcademy()).name).toBe('Northstar Flight Academy');
    expect(await repository.listDemoUsers()).toHaveLength(9);
    expect(await repository.listCadets(admin)).toHaveLength(8);
    expect((await repository.listCadets(arun)).map((item) => item.id)).toEqual(['cadet-aarav', 'cadet-ishan']);
    expect(await repository.getCadet('cadet-diya', arun)).toBeNull();
    expect((await repository.getCadet('cadet-aarav', arun))?.code).toBe('NFA-2026-001');
    expect(await repository.listFlights()).toHaveLength(9);
    expect(await repository.listCourses()).toHaveLength(2);
    expect(await repository.listAircraft()).toHaveLength(4);
    expect(await repository.listStaff()).toHaveLength(9);
    expect(await repository.fuelBalance('tank-jeta')).toBe(1800);
    expect((await repository.feeAccount('cadet-ananya'))?.overdue).toBe(true);
    expect((await repository.dashboardSummary(actor('user-super'))).operational).toBe(false);
    expect(await repository.getAircraft('ac-c172-01')).toMatchObject({ code: 'NFA-C172-01' });
    expect(await repository.getStaff('missing')).toBeNull();
  });
});

describe('operational resource mutations', () => {
  it('changes aircraft planning status without rewriting flights', () => {
    const store = fresh();
    const admin = actor('user-admin');
    expect(store.setAircraftStatus('missing', 'Maintenance', 'reason', '2026-10-31', admin).ok).toBe(false);
    expect(store.setAircraftStatus('ac-c172-02', 'Maintenance', '  ', '2026-10-31', admin)).toMatchObject({
      ok: false,
      error: 'A reason is required when the aircraft is not available.',
    });
    expect(store.getAircraft('ac-c172-02')?.status).toBe('Available');
    expect(store.setAircraftStatus('ac-c172-02', 'Maintenance', 'Hangar planning note', '', admin).ok).toBe(true);
    const aircraft = store.getAircraft('ac-c172-02');
    expect(aircraft?.status).toBe('Maintenance');
    expect(aircraft?.restriction?.until).toBe('2026-10-31');
    expect(aircraft?.restriction?.reason).toBe('Hangar planning note');
    const flight = store.getFlight('flt-2402');
    if (!flight) throw new Error('missing flight');
    expect(flight.status).toBe('Approved');
    expect(store.schedulingIssues(flightInput(flight)).some((issue) => issue.message.includes('recorded as Maintenance'))).toBe(true);
    expect(store.setAircraftStatus('ac-c172-02', 'Available', '', '2026-10-31', admin).ok).toBe(true);
    expect(store.getAircraft('ac-c172-02')?.restriction).toBeNull();
  });

  it('records a defect and a release without making the aircraft available', () => {
    const store = fresh();
    const maint = actor('user-maint');
    expect(store.addDefect({ aircraftId: '', description: '  ' }, maint)).toMatchObject({
      ok: false,
      error: 'Aircraft and description are required.',
    });
    expect(store.addDefect({ aircraftId: 'ac-da40', description: ' Demo scratch ', severity: 'Low' }, maint).ok).toBe(true);
    const defect = store.listDefects()[0];
    expect(defect).toMatchObject({ aircraftId: 'ac-da40', description: 'Demo scratch', severity: 'Low', status: 'Open', reportedBy: 'Ravi Das' });
    const order = store.listWorkOrders()[0];
    expect(order?.assigneeId).toBe('staff-ravi');
    expect(order?.status).toBe('Open');
    expect(order?.description).toBe('Demo scratch');
    expect(store.getAircraft('ac-da40')?.status).toBe('Maintenance');
    const missingOrder = store.updateWorkOrder('missing', 'Completed', maint);
    expect(missingOrder.ok).toBe(false);
    if (missingOrder.ok) return;
    expect(missingOrder.error).toBe('Work order not found.');
    expect(store.updateWorkOrder(order?.id ?? '', 'In progress', maint).ok).toBe(true);
    expect(store.listWorkOrders()[0]?.status).toBe('In progress');
    const missingNote = store.recordRelease(order?.id ?? '', '  ', maint);
    expect(missingNote.ok).toBe(false);
    if (missingNote.ok) return;
    expect(missingNote.error).toBe('Release notes are required.');
    expect(store.recordRelease(order?.id ?? '', 'Authorized entry only', maint).ok).toBe(true);
    expect(store.listWorkOrders()[0]).toMatchObject({ status: 'Release recorded', release: { by: 'Ravi Das', note: 'Authorized entry only' } });
    expect(store.getAircraft('ac-da40')?.status).toBe('Maintenance');
  });

  it('adds a leave block that the flight check reads, and keeps the flight status', () => {
    const store = fresh();
    const missingBlock = store.addAvailability({ staffId: 'staff-arun', date: '', start: '06:00', end: '08:00' });
    expect(missingBlock.ok).toBe(false);
    if (missingBlock.ok) return;
    expect(missingBlock.error).toBe('Staff member, date, and times are required.');
    expect(store.addAvailability({
      staffId: 'staff-arun',
      date: '2026-09-29',
      start: '06:00',
      end: '08:00',
      kind: 'Leave',
      reason: '',
    }, actor('user-hr')).ok).toBe(true);
    const block = store.listAvailability()[0];
    expect(block).toMatchObject({ staffId: 'staff-arun', kind: 'Leave', reason: 'Demo availability block' });
    const flight = store.getFlight('flt-2401');
    if (!flight) throw new Error('missing flight');
    expect(flight.status).toBe('Approved');
    expect(store.schedulingIssues(flightInput(flight)).some((issue) => issue.message.includes('marked leave'))).toBe(true);
  });
});

describe('finance, documents, and notifications', () => {
  it('records a payment and an expense without inventing an adjustment', () => {
    const store = fresh();
    const finance = actor('user-fin');
    const before = store.financeSnapshot().outstanding;
    const missing = store.addPayment({ cadetId: 'cadet-ishan', amount: 0, date: '2026-09-29', method: 'Cash' }, finance);
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error).toBe('Cadet, amount, date, and method are required.');
    expect(store.addPayment({ cadetId: 'cadet-ishan', amount: 10000, date: '2026-09-29', method: 'Bank transfer', reference: 'UTR-1' }, finance).ok).toBe(true);
    expect(store.financeSnapshot().outstanding).toBe(before - 10000);
    expect(store.listPayments()[0]).toMatchObject({ cadetId: 'cadet-ishan', amount: 10000, reference: 'UTR-1' });
    const expense = store.addExpense({ date: '', category: 'Fuel', description: ' ', amount: 10 }, finance);
    expect(expense.ok).toBe(false);
    if (expense.ok) return;
    expect(expense.error).toBe('Date, category, description, and amount are required.');
    expect(store.addExpense({ date: '2026-09-29', category: 'Fuel', description: 'Demo expense', amount: 2500 }, finance).ok).toBe(true);
    expect(store.listExpenses()[0]).toMatchObject({ category: 'Fuel', description: 'Demo expense', amount: 2500, branch: 'Kochi Training Base', status: 'Recorded' });
  });

  it('reviews a document label and marks visible notifications read', () => {
    const store = fresh();
    expect(store.reviewDocument('missing', 'Accepted', actor('user-cfi')).ok).toBe(false);
    expect(store.reviewDocument('doc-2', 'Accepted', actor('user-cfi')).ok).toBe(true);
    expect(store.listDocuments().find((item) => item.id === 'doc-2')?.review).toBe('Accepted');
    const cfi = actor('user-cfi');
    expect(store.listNotifications(cfi).map((item) => item.id)).toEqual(['nt-1']);
    expect(store.listNotifications(actor('user-arun'))).toEqual([]);
    expect(store.markNotificationRead('nt-1').ok).toBe(true);
    expect(store.listNotifications(cfi)[0]?.read).toBe(true);
    store.markAllNotificationsRead(actor('user-fin'));
    expect(store.listNotifications(actor('user-fin')).every((item) => item.read)).toBe(true);
    expect(store.listNotifications(actor('user-admin')).some((item) => !item.read)).toBe(true);
  });
});

describe('academy settings and demo users', () => {
  it('saves the academy profile fields the prototype edits and leaves the branch unchanged', async () => {
    const store = fresh();
    const admin = actor('user-admin');
    const missing = store.saveAcademySettings({ name: '  ' }, admin);
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error).toBe('Academy name is required.');
    const repository = createMockWorkspaceRepository({ store, wait: async () => {} });
    expect((await repository.getAcademy()).name).toBe('Northstar Flight Academy');
    expect(store.saveAcademySettings({ name: 'Northstar Demo', currency: '', timeZone: '' }, admin).ok).toBe(true);
    expect(await repository.getAcademy()).toMatchObject({
      name: 'Northstar Demo',
      currency: 'INR',
      timeZone: 'Asia/Kolkata',
      branchName: 'Kochi Training Base',
    });
    expect(store.listAudit()[0]).toMatchObject({ action: 'Settings updated', actor: 'Meera Krishnan' });
  });

  it('adds a demo user without storing a password or removing an administrator', async () => {
    const store = fresh();
    const admin = actor('user-admin');
    const missing = store.addUser({ name: ' ', email: 'new@northstar.example', role: 'instructor' }, admin);
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error).toBe('Name, email, and role are required.');
    expect(store.addUser({ name: 'Leela Demo', email: 'Leela.Demo@northstar.example', role: 'instructor' }, admin).ok).toBe(true);
    const repository = createMockWorkspaceRepository({ store, wait: async () => {} });
    const users = await repository.listDemoUsers();
    const added = users.find((user) => user.email === 'leela.demo@northstar.example');
    expect(added).toMatchObject({ name: 'Leela Demo', role: 'instructor' });
    expect(added && 'password' in added).toBe(false);
    expect(users.some((user) => user.id === 'user-admin')).toBe(true);
    const duplicate = store.addUser({ name: 'Again', email: 'leela.demo@northstar.example', role: 'hr' }, admin);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.error).toBe('That email is already a demo user.');
    expect(store.listAudit()[0]?.summary).toBe('Leela Demo added as Instructor.');
  });
});

describe('cadet portal snapshot', () => {
  it('returns only the linked cadet and hides an unlinked user', () => {
    const store = fresh();
    expect(store.portalHome(actor('user-admin'))).toBeNull();
    expect(store.portalHome({ ...actor('user-aarav'), cadetId: 'missing' })).toBeNull();
    const home = store.portalHome(actor('user-aarav'));
    if (!home) throw new Error('missing portal');
    expect(home.code).toBe('NFA-2026-001');
    expect(home.flights.map((flight) => flight.reference)).toEqual(['FLT-2409', 'FLT-2401']);
    expect(home.documents.map((document) => document.title)).toEqual(['Cadet enrolment form']);
    expect(home.payments).toHaveLength(1);
    expect(home.notifications.map((note) => note.id)).toEqual(['nt-4']);
    expect(JSON.stringify(home)).not.toContain('Morning dual');
    expect(JSON.stringify(home)).not.toContain('Diya');
  });
});
