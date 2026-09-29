import type { ReactNode } from 'react';
import type { Permission } from '../../domain/permissions';
import { AccessDenied } from './AccessDenied';
import { useAuth } from './AuthProvider';

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(permission)) return <AccessDenied />;
  return children;
}
