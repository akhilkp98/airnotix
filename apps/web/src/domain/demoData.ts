import type { RoleId } from './permissions';

export const DEMO_PASSWORD = 'demonstration';
export const SESSION_STORAGE_KEY = 'airnotix-web-session-v1';
export const REMEMBERED_EMAIL_KEY = 'airnotix-web-email';
export const SIDEBAR_STORAGE_KEY = 'airnotix-web-sidebar';

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  staffId?: string;
  cadetId?: string;
};

export type AcademyProfile = {
  name: string;
  branchName: string;
  country: string;
  currency: string;
  timeZone: string;
  mode: string;
};

export const ACADEMY: AcademyProfile = {
  name: 'Northstar Flight Academy',
  branchName: 'Kochi Training Base',
  country: 'India',
  currency: 'INR',
  timeZone: 'Asia/Kolkata',
  mode: 'Demo',
};

export const DEMO_USERS: DemoUser[] = [
  { id: 'user-super', name: 'Anil Rao', email: 'anil.rao@arionix.example', role: 'super-admin' },
  { id: 'user-admin', name: 'Meera Krishnan', email: 'meera.krishnan@northstar.example', role: 'academy-admin', staffId: 'staff-meera' },
  { id: 'user-ops', name: 'Kabir Nair', email: 'kabir.nair@northstar.example', role: 'operations', staffId: 'staff-kabir' },
  { id: 'user-cfi', name: 'Nisha Varghese', email: 'nisha.varghese@northstar.example', role: 'cfi', staffId: 'staff-nisha' },
  { id: 'user-arun', name: 'Arun Menon', email: 'arun.menon@northstar.example', role: 'instructor', staffId: 'staff-arun' },
  { id: 'user-maint', name: 'Ravi Das', email: 'ravi.das@northstar.example', role: 'maintenance', staffId: 'staff-ravi' },
  { id: 'user-fin', name: 'Priya Shah', email: 'priya.shah@northstar.example', role: 'finance', staffId: 'staff-priya' },
  { id: 'user-hr', name: 'Devika Rao', email: 'devika.rao@northstar.example', role: 'hr', staffId: 'staff-devika' },
  { id: 'user-aarav', name: 'Aarav Menon', email: 'aarav.menon@northstar.example', role: 'cadet', cadetId: 'cadet-aarav' },
];

export function findDemoUser(userId: string) {
  return DEMO_USERS.find((user) => user.id === userId);
}

export function findDemoUserByEmail(email: string) {
  const normalised = email.trim().toLowerCase();
  return DEMO_USERS.find((user) => user.email === normalised);
}
