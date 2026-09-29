import { useAuth } from '../auth/AuthProvider';
import {
  AcademyDashboard,
  CfiDashboard,
  FinanceDashboard,
  HrDashboard,
  InstructorDashboard,
  MaintenanceDashboard,
  OperationsDashboard,
  SuperAdminDashboard,
} from './RoleDashboards';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'super-admin') return <SuperAdminDashboard />;
  if (user.role === 'academy-admin') return <AcademyDashboard />;
  if (user.role === 'operations') return <OperationsDashboard />;
  if (user.role === 'cfi') return <CfiDashboard />;
  if (user.role === 'instructor') return <InstructorDashboard />;
  if (user.role === 'maintenance') return <MaintenanceDashboard />;
  if (user.role === 'finance') return <FinanceDashboard />;
  if (user.role === 'hr') return <HrDashboard />;
  return null;
}
