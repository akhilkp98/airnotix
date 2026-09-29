import { describe, expect, it } from 'vitest';
import { weekDates } from '../../domain/calculations';
import { createWorkspaceFixture } from '../../domain/fixtures';
import { filterScheduleFlights, validateCompletion, validateCorrection, validateFlightDraft } from './flightRules';

describe('flight screen rules', () => {
  const fixture = createWorkspaceFixture();

  it('filters the prototype week and keeps cancelled flights available to the status filter', () => {
    const dates = weekDates('2026-09-29');
    const week = filterScheduleFlights(fixture.flights, { status: '', aircraftId: '', dates, view: 'week', date: '2026-09-29' });
    expect(week.map((flight) => flight.reference)).toContain('FLT-2401');
    expect(week.map((flight) => flight.reference)).toContain('FLT-2410');
    const cancelled = filterScheduleFlights(fixture.flights, { status: 'Cancelled', aircraftId: '', dates, view: 'week', date: '2026-09-29' });
    expect(cancelled.map((flight) => flight.reference)).toEqual(['FLT-2410']);
  });

  it('uses the prototype required-field messages', () => {
    expect(validateFlightDraft({ date: '', start: '', end: '', cadetId: '', instructorId: '', aircraftId: '' }).message)
      .toBe('Date, times, cadet, instructor, and aircraft are required.');
    expect(validateCompletion({ start: '', end: '', hours: '0', outcome: '' }).message)
      .toBe('Actual times, hours, and an outcome are required.');
    expect(validateCorrection('', '').message).toBe('A revised hour value and a reason are required.');
    expect(validateCorrection('1.5', 'Revised block time').ok).toBe(true);
  });
});
