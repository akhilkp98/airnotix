import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  ChartColumn,
  CreditCard,
  Droplets,
  Folder,
  LayoutGrid,
  List,
  Navigation,
  Plane,
  Settings,
  Shield,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';
import type { Permission } from '../../domain/permissions';

export type NavItem = {
  kind: 'item';
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  permission: Permission;
  prefix?: string;
};

export type NavEntry = { kind: 'group'; label: string } | NavItem;

export const STAFF_NAV: NavEntry[] = [
  { kind: 'group', label: 'Overview' },
  { kind: 'item', id: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutGrid, permission: 'dashboard.view' },
  { kind: 'group', label: 'Academy' },
  { kind: 'item', id: 'cadets', label: 'Cadets', to: '/cadets', icon: Users, permission: 'cadets.view', prefix: '/cadets' },
  { kind: 'item', id: 'training', label: 'Training & Knowledge', to: '/training/courses', icon: BookOpen, permission: 'training.view', prefix: '/training' },
  { kind: 'item', id: 'operations', label: 'Flight Operations', to: '/flight-operations', icon: Navigation, permission: 'flights.view', prefix: '/flight-operations' },
  { kind: 'item', id: 'fleet', label: 'Fleet', to: '/fleet', icon: Plane, permission: 'fleet.view', prefix: '/fleet' },
  { kind: 'item', id: 'maintenance', label: 'Maintenance', to: '/maintenance', icon: Wrench, permission: 'maintenance.view' },
  { kind: 'item', id: 'fuel', label: 'Fuel', to: '/fuel', icon: Droplets, permission: 'fuel.view' },
  { kind: 'item', id: 'finance', label: 'Finance', to: '/finance', icon: CreditCard, permission: 'finance.view' },
  { kind: 'item', id: 'staff', label: 'HR & Staff', to: '/hr', icon: Briefcase, permission: 'staff.view', prefix: '/hr' },
  { kind: 'group', label: 'Governance' },
  { kind: 'item', id: 'documents', label: 'Documents & Compliance', to: '/documents', icon: Folder, permission: 'documents.view' },
  { kind: 'item', id: 'approvals', label: 'Notifications & Approvals', to: '/approvals', icon: Bell, permission: 'approvals.view' },
  { kind: 'item', id: 'reports', label: 'Reports', to: '/reports', icon: ChartColumn, permission: 'reports.view' },
  { kind: 'group', label: 'Administration' },
  { kind: 'item', id: 'settings', label: 'Academy Settings', to: '/settings', icon: Settings, permission: 'settings.manage' },
  { kind: 'item', id: 'users', label: 'Users & Roles', to: '/users', icon: Shield, permission: 'users.manage' },
  { kind: 'item', id: 'audit', label: 'Audit Log', to: '/audit', icon: List, permission: 'audit.view' },
];

export const PORTAL_NAV: NavEntry[] = [
  { kind: 'item', id: 'portal', label: 'Overview', to: '/portal', icon: LayoutGrid, permission: 'portal.view' },
  { kind: 'item', id: 'portal-profile', label: 'My Profile', to: '/portal/profile', icon: UserRound, permission: 'portal.view' },
  { kind: 'item', id: 'portal-training', label: 'My Training', to: '/portal/training', icon: BookOpen, permission: 'portal.view' },
  { kind: 'item', id: 'portal-schedule', label: 'My Flights', to: '/portal/schedule', icon: Calendar, permission: 'portal.view', prefix: '/portal/schedule' },
  { kind: 'item', id: 'portal-documents', label: 'My Documents', to: '/portal/documents', icon: Folder, permission: 'portal.view' },
  { kind: 'item', id: 'portal-fees', label: 'My Fees', to: '/portal/fees', icon: CreditCard, permission: 'portal.view' },
  { kind: 'item', id: 'portal-notifications', label: 'Notifications', to: '/portal/notifications', icon: Bell, permission: 'portal.view' },
];

export function filterNav(entries: NavEntry[], can: (permission: Permission) => boolean) {
  const visible: NavEntry[] = [];
  let group: NavEntry | null = null;
  let items: NavItem[] = [];

  const flush = () => {
    if (items.length === 0) return;
    if (group) visible.push(group);
    visible.push(...items);
    items = [];
  };

  entries.forEach((entry) => {
    if (entry.kind === 'group') {
      flush();
      group = entry;
      return;
    }
    if (can(entry.permission)) items.push(entry);
  });
  flush();
  return visible;
}

export function isNavActive(pathname: string, item: NavItem) {
  if (item.prefix) return pathname === item.prefix || pathname.startsWith(`${item.prefix}/`);
  return pathname === item.to;
}
