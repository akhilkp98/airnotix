import { describe, expect, it } from 'vitest';
import {
  blockers,
  dashboardSummary,
  feeAccount,
  formatDate,
  fuelBalance,
  progressPercent,
  recordedAircraftHours,
  recordedCadetHours,
  schedulingIssues,
  weekDates,
} from './calculations';
import { DEMO_PASSWORD, findDemoUser, findDemoUserByEmail } from './demoData';
import { DEMO_TODAY, createWorkspaceFixture } from './fixtures';
import type { Flight } from './workspace';

function cadet(state: ReturnType<typeof createWorkspaceFixture>, id: string) {
  const found = state.cadets.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

function flight(state: ReturnType<typeof createWorkspaceFixture>, id: string): Flight {
  const found = state.flights.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

describe('prototype fixture calculations', () => {
  const state = createWorkspaceFixture();

  it('keeps the seed counts and course weight', () => {
    expect(state.cadets).toHaveLength(8);
    expect(state.flights).toHaveLength(9);
    expect(state.courses.every((course) => course.requiredCount === 100)).toBe(true);
    expect(DEMO_TODAY).toBe('2026-09-29');
  });

  it('uses completedRequired against requiredCount, not the named syllabus items', () => {
    expect(progressPercent(state, cadet(state, 'cadet-aarav'))).toBe(36);
    expect(progressPercent(state, cadet(state, 'cadet-diya'))).toBe(52);
    expect(progressPercent(state, cadet(state, 'cadet-rohan'))).toBe(24);
    expect(progressPercent(state, cadet(state, 'cadet-meera'))).toBe(68);
    expect(progressPercent(state, cadet(state, 'cadet-ishan'))).toBe(41);
    expect(progressPercent(state, cadet(state, 'cadet-ananya'))).toBe(17);
    expect(progressPercent(state, cadet(state, 'cadet-neil'))).toBe(100);
    expect(progressPercent(state, cadet(state, 'cadet-sara'))).toBe(29);
    expect(cadet(state, 'cadet-aarav').completedItemIds).toEqual([]);
  });

  it('adds completed actual hours to the opening balance', () => {
    expect(recordedCadetHours(state, 'cadet-aarav')).toBe(29.8);
    expect(recordedAircraftHours(state, 'ac-c172-01')).toBe(4121.9);
    expect(recordedCadetHours(state, 'cadet-diya')).toBe(41);
  });

  it('flags the FLT-2405 overlap with FLT-2404 and ignores a cancelled flight', () => {
    const draft = flight(state, 'flt-2405');
    const issues = schedulingIssues(state, draft, draft.id);
    expect(issues.filter((issue) => issue.level === 'blocker').map((issue) => issue.conflictId)).toEqual(['flt-2404', 'flt-2404']);
    expect(issues.map((issue) => issue.message)).toEqual([
      'Instructor overlaps FLT-2404 (09:00\u201311:00).',
      'Aircraft overlaps FLT-2404 (09:00\u201311:00).',
    ]);

    const besideCancelled = schedulingIssues(state, {
      date: '2026-10-02',
      start: '15:00',
      end: '16:30',
      cadetId: 'cadet-sara',
      instructorId: 'staff-leela',
      aircraftId: 'ac-c172-02',
    });
    expect(blockers(besideCancelled)).toEqual([]);
  });

  it('does not treat touching times as an overlap', () => {
    const issues = schedulingIssues(state, {
      date: '2026-09-29',
      start: '08:00',
      end: '08:30',
      cadetId: 'cadet-rohan',
      instructorId: 'staff-leela',
      aircraftId: 'ac-c172-01',
    });
    expect(issues.some((issue) => issue.conflictId === 'flt-2401')).toBe(false);
  });

  it('reports Farhan leave and the restricted aircraft on FLT-2407', () => {
    const draft = flight(state, 'flt-2407');
    const issues = schedulingIssues(state, draft, draft.id);
    expect(issues.map((issue) => issue.message)).toEqual([
      'Instructor is marked leave 13:00\u201318:00. Demo leave block',
      'NFA-DA42-01 is recorded as Restricted. This is a planning constraint, not a serviceability decision. Demo restriction pending a document check. Not a serviceability decision.',
      'Illustrative flight instructor record is dated before this flight (2026-09-20). This is informational only.',
    ]);
  });

  it('keeps an expired qualification as a warning and blocks a non-available aircraft by status', () => {
    const waiting = flight(state, 'flt-2403');
    const issues = schedulingIssues(state, waiting, waiting.id);
    expect(blockers(issues)).toEqual([]);
    expect(issues).toEqual([{
      level: 'warning',
      resource: 'Qualification',
      message: 'Illustrative flight instructor record is dated before this flight (2026-09-20). This is informational only.',
    }]);

    const maintenance = schedulingIssues(state, {
      date: '2026-09-29',
      start: '14:00',
      end: '15:00',
      cadetId: 'cadet-sara',
      instructorId: 'staff-arun',
      aircraftId: 'ac-da40',
    });
    expect(maintenance.some((issue) => issue.message.startsWith('NFA-DA40-01 is recorded as Maintenance.'))).toBe(true);
    expect(maintenance.some((issue) => issue.message.includes('planning restriction until'))).toBe(false);
  });

  it('blocks an available aircraft only while the restriction covers the date', () => {
    const next = createWorkspaceFixture();
    const aircraft = next.aircraft.find((item) => item.id === 'ac-c172-01');
    if (!aircraft) throw new Error('missing aircraft');
    aircraft.restriction = { from: '2026-09-29', until: '2026-09-30', reason: 'Demo range' };
    const covered = schedulingIssues(next, {
      date: '2026-09-29',
      start: '14:00',
      end: '15:00',
      cadetId: 'cadet-sara',
      instructorId: 'staff-leela',
      aircraftId: 'ac-c172-01',
    });
    expect(covered.some((issue) => issue.message === 'NFA-C172-01 has a planning restriction until 2026-09-30. Demo range')).toBe(true);

    const outside = schedulingIssues(next, {
      date: '2026-10-05',
      start: '14:00',
      end: '15:00',
      cadetId: 'cadet-sara',
      instructorId: 'staff-leela',
      aircraftId: 'ac-c172-01',
    });
    expect(outside.some((issue) => issue.resource === 'Aircraft')).toBe(false);
  });

  it('does not warn when the qualification date is the flight date', () => {
    const next = createWorkspaceFixture();
    const instructor = next.staff.find((item) => item.id === 'staff-farhan');
    if (!instructor) throw new Error('missing instructor');
    instructor.qualifications[0].expires = '2026-09-29';
    const waiting = flight(next, 'flt-2403');
    expect(schedulingIssues(next, waiting, waiting.id)).toEqual([]);
  });

  it('stops at the required-field blocker', () => {
    expect(schedulingIssues(state, { date: '2026-09-29', start: '10:00', end: '09:00' })).toEqual([{
      level: 'blocker',
      resource: 'Form',
      message: 'Date, times, cadet, instructor, and aircraft are required.',
    }]);
    const reversed = schedulingIssues(state, {
      date: '2026-09-29',
      start: '10:00',
      end: '10:00',
      cadetId: 'cadet-sara',
      instructorId: 'staff-leela',
      aircraftId: 'ac-c172-02',
    });
    expect(reversed[0]).toMatchObject({ level: 'blocker', resource: 'Time' });
  });

  it('calculates fuel stock from receipts, issues, and signed adjustments', () => {
    expect(fuelBalance(state, 'tank-avgas')).toBe(4700);
    expect(fuelBalance(state, 'tank-jeta')).toBe(1800);
    const next = createWorkspaceFixture();
    next.fuelTransactions.push({
      id: 'fuel-adjust',
      tankId: 'tank-avgas',
      type: 'Adjustment',
      quantity: -100,
      unitCost: 0,
      at: '2026-09-29T00:00:00+05:30',
      reference: 'ADJ',
      notes: '',
      reason: 'Demo dip',
    });
    expect(fuelBalance(next, 'tank-avgas')).toBe(4600);
  });

  it('marks only positive balances due before the demo day as overdue', () => {
    const ishan = feeAccount(state, cadet(state, 'cadet-ishan'));
    const ananya = feeAccount(state, cadet(state, 'cadet-ananya'));
    const neil = feeAccount(state, cadet(state, 'cadet-neil'));
    const aarav = feeAccount(state, cadet(state, 'cadet-aarav'));
    expect(ishan).toMatchObject({ total: 1850000, paid: 0, outstanding: 1850000, overdue: true });
    expect(ananya).toMatchObject({ total: 650000, paid: 0, outstanding: 650000, overdue: true });
    expect(neil).toMatchObject({ outstanding: 0, overdue: false });
    expect(aarav.overdue).toBe(false);

    const dueToday = createWorkspaceFixture();
    cadet(dueToday, 'cadet-ishan').feeDueDate = DEMO_TODAY;
    expect(feeAccount(dueToday, cadet(dueToday, 'cadet-ishan')).overdue).toBe(false);

    const billed = state.cadets.reduce((sum, item) => sum + feeAccount(state, item).total, 0);
    const paid = state.cadets.reduce((sum, item) => sum + feeAccount(state, item).paid, 0);
    const outstanding = state.cadets.reduce((sum, item) => sum + feeAccount(state, item).outstanding, 0);
    expect(billed).toBe(12400000);
    expect(paid).toBe(3350000);
    expect(outstanding).toBe(9050000);
  });

  it('builds the prototype week containing the demo day', () => {
    expect(weekDates(DEMO_TODAY)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(formatDate('2026-09-29')).toBe('29 Sep 2026');
    expect(formatDate('')).toBe('\u2014');
  });

  it('hides operational dashboard figures when the user cannot view cadets or flights', () => {
    const admin = findDemoUser('user-admin');
    const platform = findDemoUser('user-super');
    const maintenance = findDemoUser('user-maint');
    if (!admin || !platform || !maintenance) throw new Error('missing demo user');
    expect(dashboardSummary(state, admin)).toEqual({
      operational: true,
      activeCadets: 6,
      flightsToday: 3,
      completedHoursThisMonth: 1.4,
      availableAircraft: 2,
      pendingApprovals: 1,
      outstandingFees: 9050000,
    });
    expect(dashboardSummary(state, platform).operational).toBe(false);
    expect(dashboardSummary(state, maintenance)).toEqual(dashboardSummary(state, platform));
  });

  it('keeps the demonstration sign-in identity', () => {
    const meera = findDemoUserByEmail('meera.krishnan@northstar.example');
    expect(DEMO_PASSWORD).toBe('demonstration');
    expect(meera).toMatchObject({ id: 'user-admin', role: 'academy-admin', staffId: 'staff-meera' });
    expect(findDemoUser('user-aarav')?.cadetId).toBe('cadet-aarav');
    expect(findDemoUser('user-arun')?.staffId).toBe('staff-arun');
  });
});
