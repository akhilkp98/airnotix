import { describe, expect, it } from 'vitest';
import { createWorkspaceFixture } from '../../domain/fixtures';
import { filterCadets, instructorStaff, nextApprovedFlight, validateCadetForm } from './cadetRules';

describe('cadet list filters and enrolment checks', () => {
  const state = createWorkspaceFixture();

  it('searches code, name, and batch and filters course and status', () => {
    expect(filterCadets(state.cadets, { search: 'nfa-2026-002', courseId: '', status: '' }).map((cadet) => cadet.id)).toEqual(['cadet-diya']);
    expect(filterCadets(state.cadets, { search: 'ishan pillai', courseId: '', status: '' }).map((cadet) => cadet.id)).toEqual(['cadet-ishan']);
    expect(filterCadets(state.cadets, { search: 'ppl-2026-a', courseId: '', status: '' }).map((cadet) => cadet.id).sort()).toEqual(['cadet-ananya', 'cadet-rohan']);
    expect(filterCadets(state.cadets, { search: '', courseId: 'course-ppl', status: 'Active' }).map((cadet) => cadet.id).sort()).toEqual(['cadet-ananya', 'cadet-rohan']);
    expect(filterCadets(state.cadets, { search: 'aarav', courseId: 'course-ppl', status: '' })).toEqual([]);
    expect(filterCadets(state.cadets, { search: '', courseId: '', status: 'On Hold' }).map((cadet) => cadet.id)).toEqual(['cadet-ishan']);
  });

  it('requires the prototype enrolment fields and accepts a blank email', () => {
    const missing = validateCadetForm({ email: 'not-an-email' });
    expect(missing.error).toBe('First name, last name, course, and joining date are required.');
    expect(missing.errors.firstName).toBe('First name is required.');
    expect(missing.errors.courseId).toBe('Course is required.');
    const email = validateCadetForm({
      firstName: 'New',
      lastName: 'Cadet',
      courseId: 'course-ppl',
      joiningDate: '2026-09-29',
      email: 'not-an-email',
    });
    expect(email.error).toBe('Enter a valid email address, or leave it blank.');
    expect(validateCadetForm({
      firstName: ' New ',
      lastName: 'Cadet',
      courseId: 'course-ppl',
      joiningDate: '2026-09-29',
      email: '',
    }).error).toBeUndefined();
  });

  it('offers staff whose role contains instructor and keeps the stored next-flight order', () => {
    expect(instructorStaff(state.staff).map((person) => person.id)).toEqual(['staff-nisha', 'staff-arun', 'staff-leela', 'staff-farhan']);
    expect(nextApprovedFlight(state.flights, 'cadet-aarav')?.reference).toBe('FLT-2401');
    expect(nextApprovedFlight(state.flights, 'cadet-neil')).toBeUndefined();
  });
});
