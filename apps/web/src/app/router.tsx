import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { EmptyState } from '../components/data/EmptyState';
import { PageHeader } from '../components/data/PageHeader';
import type { Permission } from '../domain/permissions';
import { LoginPage } from '../features/auth/LoginPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { RequirePermission } from '../features/auth/RequirePermission';
import { useAuth } from '../features/auth/AuthProvider';
import { CadetFormPage } from '../features/cadets/CadetFormPage';
import { CadetListPage } from '../features/cadets/CadetListPage';
import { CadetProfilePage } from '../features/cadets/CadetProfilePage';
import { CoursesPage } from '../features/training/CoursesPage';
import { ProgressPage } from '../features/training/ProgressPage';
import { SyllabusPage } from '../features/training/SyllabusPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { FlightDetailPage } from '../features/flights/FlightDetailPage';
import { FlightFormPage } from '../features/flights/FlightFormPage';
import { FlightSchedulePage } from '../features/flights/FlightSchedulePage';
import { ApprovalsPage } from '../features/approvals/ApprovalsPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { FinancePage } from '../features/finance/FinancePage';
import { AircraftDetailPage } from '../features/fleet/AircraftDetailPage';
import { FleetListPage } from '../features/fleet/FleetListPage';
import { FuelPage } from '../features/fuel/FuelPage';
import { MaintenancePage } from '../features/maintenance/MaintenancePage';
import { StaffDetailPage } from '../features/staff/StaffDetailPage';
import { StaffListPage } from '../features/staff/StaffListPage';
import { AuditPage } from '../features/audit/AuditPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { PortalDocumentsPage } from '../features/portal/PortalDocumentsPage';
import { PortalFeesPage } from '../features/portal/PortalFeesPage';
import { PortalFlightPage, PortalFlightsPage } from '../features/portal/PortalFlightsPage';
import { PortalNotificationsPage } from '../features/portal/PortalNotificationsPage';
import { PortalOverviewPage } from '../features/portal/PortalOverviewPage';
import { PortalProfilePage } from '../features/portal/PortalProfilePage';
import { PortalTrainingPage } from '../features/portal/PortalTrainingPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { UsersPage } from '../features/users/UsersPage';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router';

function guard(permission: Permission, page: ReactNode) {
  return <RequirePermission permission={permission}>{page}</RequirePermission>;
}

function HomeRedirect() {
  const { homePath } = useAuth();
  return <Navigate to={homePath} replace />;
}

function NotFoundPage() {
  const { homePath } = useAuth();
  return (
    <>
      <PageHeader title="Page not found" subtitle="This address is not part of the Airnotix workspace." />
      <EmptyState
        title="That page does not exist"
        body="Check the address, or return to the pages available for this demonstration role."
        action={<Button component={RouterLink} to={homePath} variant="contained" color="accent">Back to your workspace</Button>}
      />
    </>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'dashboard', element: guard('dashboard.view', <DashboardPage />) },
      { path: 'cadets/new', element: guard('cadets.create', <CadetFormPage />) },
      { path: 'cadets/:cadetId', element: guard('cadets.view', <CadetProfilePage />) },
      { path: 'cadets', element: guard('cadets.view', <CadetListPage />) },
      { path: 'training/courses', element: guard('training.view', <CoursesPage />) },
      { path: 'training/syllabus', element: guard('training.view', <SyllabusPage />) },
      { path: 'training/progress', element: guard('training.view', <ProgressPage />) },
      { path: 'flight-operations/new', element: guard('flights.create', <FlightFormPage />) },
      { path: 'flight-operations/:flightId', element: guard('flights.view', <FlightDetailPage />) },
      { path: 'flight-operations', element: guard('flights.view', <FlightSchedulePage />) },
      { path: 'fleet/:aircraftId', element: guard('fleet.view', <AircraftDetailPage />) },
      { path: 'fleet', element: guard('fleet.view', <FleetListPage />) },
      { path: 'maintenance', element: guard('maintenance.view', <MaintenancePage />) },
      { path: 'fuel', element: guard('fuel.view', <FuelPage />) },
      { path: 'finance', element: guard('finance.view', <FinancePage />) },
      { path: 'hr/:staffId', element: guard('staff.view', <StaffDetailPage />) },
      { path: 'hr', element: guard('staff.view', <StaffListPage />) },
      { path: 'documents', element: guard('documents.view', <DocumentsPage />) },
      { path: 'approvals', element: guard('approvals.view', <ApprovalsPage />) },
      { path: 'reports', element: guard('reports.view', <ReportsPage />) },
      { path: 'settings', element: guard('settings.manage', <SettingsPage />) },
      { path: 'users', element: guard('users.manage', <UsersPage />) },
      { path: 'audit', element: guard('audit.view', <AuditPage />) },
      { path: 'portal', element: guard('portal.view', <PortalOverviewPage />) },
      { path: 'portal/schedule/:flightId', element: guard('portal.view', <PortalFlightPage />) },
      { path: 'portal/schedule', element: guard('portal.view', <PortalFlightsPage />) },
      { path: 'portal/training', element: guard('portal.view', <PortalTrainingPage />) },
      { path: 'portal/documents', element: guard('portal.view', <PortalDocumentsPage />) },
      { path: 'portal/fees', element: guard('portal.view', <PortalFeesPage />) },
      { path: 'portal/notifications', element: guard('portal.view', <PortalNotificationsPage />) },
      { path: 'portal/profile', element: guard('portal.view', <PortalProfilePage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
