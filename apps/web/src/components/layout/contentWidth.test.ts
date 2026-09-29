import { describe, expect, it } from 'vitest';
import { formPanelMaxWidth, shellMaxWidth, workspaceMaxWidth } from './contentWidth';

const routes = [
  '/dashboard',
  '/cadets',
  '/cadets/new',
  '/cadets/cadet-aarav',
  '/training/courses',
  '/training/syllabus',
  '/training/progress',
  '/flight-operations',
  '/flight-operations/new',
  '/flight-operations/flt-2401',
  '/fleet',
  '/fleet/ac-c172-01',
  '/maintenance',
  '/fuel',
  '/finance',
  '/hr',
  '/hr/staff-arun',
  '/documents',
  '/approvals',
  '/reports',
  '/audit',
  '/settings',
  '/users',
  '/portal',
  '/portal/profile',
  '/portal/training',
  '/portal/schedule',
  '/portal/schedule/flt-2401',
  '/portal/documents',
  '/portal/fees',
  '/portal/notifications',
];

describe('workspace frame', () => {
  it('gives every list, detail, create, and portal route the same shell width', () => {
    const widths = routes.map(() => shellMaxWidth());
    expect(new Set(widths)).toEqual(new Set([workspaceMaxWidth]));
    expect(workspaceMaxWidth).toBe(1680);
    expect(formPanelMaxWidth).toBeLessThan(workspaceMaxWidth);
  });
});
