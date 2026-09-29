import { describe, expect, it } from 'vitest';
import { createWorkspaceFixture } from '../../domain/fixtures';
import {
  assignedActiveCadets,
  cadetDisplayName,
  CADET_OUTSIDE_ASSIGNMENT,
  countStatus,
  draftFlights,
  flightsOnDemoDay,
  followUpFlights,
  instructorUpcomingFlights,
  lowFuelTanks,
  statusBreakdown,
  usersByRole,
} from './dashboardRules';
import { fuelBalance } from '../../domain/calculations';

describe('dashboard rules', () => {
  const state = createWorkspaceFixture();

  it('counts the fixture without treating every cadet as active', () => {
    expect(countStatus(state.cadets, 'Active')).toBe(6);
    expect(countStatus(state.cadets, 'On Hold')).toBe(1);
    expect(flightsOnDemoDay(state.flights)).toHaveLength(3);
    expect(draftFlights(state.flights).map((flight) => flight.reference)).toEqual(['FLT-2405', 'FLT-2407']);
  });

  it('keeps instructor flights and follow-ups on the signed-in staff id', () => {
    const active = assignedActiveCadets(state.cadets.filter((cadet) => cadet.instructorId === 'staff-arun'));
    expect(active.map((cadet) => cadet.firstName)).toEqual(['Aarav']);
    expect(instructorUpcomingFlights(state.flights, 'staff-arun').map((flight) => flight.reference)).toEqual(['FLT-2401', 'FLT-2404', 'FLT-2405']);
    expect(followUpFlights(state.flights, 'staff-arun')).toEqual([]);
    expect(instructorUpcomingFlights(state.flights, 'staff-leela').some((flight) => flight.cadetId === 'cadet-aarav')).toBe(false);
  });

  it('marks only the jet tank as low stock and groups demonstration accounts', () => {
    const balances = Object.fromEntries(state.tanks.map((tank) => [tank.id, fuelBalance(state, tank.id)]));
    expect(lowFuelTanks(state.tanks, balances).map((tank) => tank.id)).toEqual(['tank-jeta']);
    expect(usersByRole(state.users)).toHaveLength(9);
    expect(usersByRole(state.users).every((role) => role.count === 1)).toBe(true);
  });

  it('groups real statuses and does not invent a cadet name', () => {
    expect(statusBreakdown(state.cadets)).toEqual([
      { label: 'Active', count: 6 },
      { label: 'On Hold', count: 1 },
      { label: 'Completed', count: 1 },
    ]);
    expect(cadetDisplayName(undefined, CADET_OUTSIDE_ASSIGNMENT)).toBe(CADET_OUTSIDE_ASSIGNMENT);
    expect(cadetDisplayName({ firstName: 'Aarav', lastName: 'Menon' }, CADET_OUTSIDE_ASSIGNMENT)).toBe('Aarav Menon');
  });
});
