export type RoleId =
  | 'super-admin'
  | 'academy-admin'
  | 'operations'
  | 'cfi'
  | 'instructor'
  | 'maintenance'
  | 'finance'
  | 'hr'
  | 'cadet';

export type Permission =
  | 'dashboard.view'
  | 'cadets.view'
  | 'cadets.create'
  | 'cadets.update'
  | 'training.view'
  | 'training.configure'
  | 'training.assess'
  | 'flights.view'
  | 'flights.create'
  | 'flights.update'
  | 'flights.submit'
  | 'flights.approve'
  | 'flights.complete'
  | 'fleet.view'
  | 'fleet.manage'
  | 'maintenance.view'
  | 'maintenance.record'
  | 'maintenance.release_record'
  | 'fuel.view'
  | 'fuel.manage'
  | 'finance.view'
  | 'finance.manage'
  | 'finance.adjust'
  | 'staff.view'
  | 'staff.manage'
  | 'documents.view'
  | 'documents.manage'
  | 'documents.review'
  | 'approvals.view'
  | 'reports.view'
  | 'reports.export'
  | 'settings.manage'
  | 'users.manage'
  | 'audit.view'
  | 'portal.view';

const ALL_STAFF = [
  'dashboard.view',
  'cadets.view',
  'cadets.create',
  'cadets.update',
  'training.view',
  'training.configure',
  'training.assess',
  'flights.view',
  'flights.create',
  'flights.update',
  'flights.submit',
  'flights.approve',
  'flights.complete',
  'fleet.view',
  'fleet.manage',
  'maintenance.view',
  'maintenance.record',
  'maintenance.release_record',
  'fuel.view',
  'fuel.manage',
  'finance.view',
  'finance.manage',
  'finance.adjust',
  'staff.view',
  'staff.manage',
  'documents.view',
  'documents.manage',
  'documents.review',
  'approvals.view',
  'reports.view',
  'reports.export',
  'settings.manage',
  'users.manage',
  'audit.view',
] as const satisfies readonly Permission[];

export const ROLE_LABELS: Record<RoleId, string> = {
  'super-admin': 'Super Admin',
  'academy-admin': 'Academy Administrator',
  operations: 'Operations Manager',
  cfi: 'Chief Flying Instructor',
  instructor: 'Instructor',
  maintenance: 'Maintenance Officer',
  finance: 'Finance Officer',
  hr: 'HR / Staff Coordinator',
  cadet: 'Cadet',
};

export const ROLE_PERMISSIONS: Record<RoleId, readonly Permission[]> = {
  'super-admin': ['dashboard.view', 'settings.manage', 'users.manage', 'audit.view', 'reports.view'],
  'academy-admin': ALL_STAFF.filter((item) => item !== 'maintenance.release_record'),
  operations: [
    'dashboard.view',
    'cadets.view',
    'training.view',
    'flights.view',
    'flights.create',
    'flights.update',
    'flights.submit',
    'fleet.view',
    'maintenance.view',
    'fuel.view',
    'fuel.manage',
    'staff.view',
    'documents.view',
    'approvals.view',
    'reports.view',
  ],
  cfi: [
    'dashboard.view',
    'cadets.view',
    'training.view',
    'training.configure',
    'training.assess',
    'flights.view',
    'flights.approve',
    'staff.view',
    'documents.view',
    'documents.review',
    'approvals.view',
    'reports.view',
  ],
  instructor: [
    'dashboard.view',
    'cadets.view',
    'training.view',
    'training.assess',
    'flights.view',
    'flights.complete',
    'documents.view',
  ],
  maintenance: [
    'dashboard.view',
    'fleet.view',
    'maintenance.view',
    'maintenance.record',
    'maintenance.release_record',
    'documents.view',
    'documents.manage',
    'reports.view',
  ],
  finance: [
    'dashboard.view',
    'cadets.view',
    'finance.view',
    'finance.manage',
    'finance.adjust',
    'documents.view',
    'reports.view',
    'reports.export',
  ],
  hr: ['dashboard.view', 'staff.view', 'staff.manage', 'documents.view', 'reports.view'],
  cadet: ['portal.view'],
};

export function canUser(role: RoleId, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function homePathForRole(role: RoleId) {
  return role === 'cadet' ? '/portal' : '/dashboard';
}
