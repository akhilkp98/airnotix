// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { AppSnackbarProvider } from '../../components/feedback/snackbar';
import { inr } from '../../domain/calculations';
import { SESSION_STORAGE_KEY } from '../../domain/demoData';
import { RequireAuth } from '../auth/RequireAuth';
import { RequirePermission } from '../auth/RequirePermission';
import { AuthProvider } from '../auth/AuthProvider';
import { ReportsPage } from '../reports/ReportsPage';
import { PortalOverviewPage } from '../portal/PortalOverviewPage';
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore } from '../../services/repositories/workspaceStore';
import { theme } from '../../theme/theme';
import { DashboardPage } from './DashboardPage';

beforeEach(() => {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return false; },
    });
  }
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderDashboard(path: string, userId: string) {
  localStorage.setItem(SESSION_STORAGE_KEY, userId);
  const store = createWorkspaceStore(createMemoryStorage());
  const repository = createMockWorkspaceRepository({ store, wait: async () => {} });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/login', element: <div>Sign in</div> },
    {
      path: '/',
      element: <RequireAuth><Outlet /></RequireAuth>,
      children: [
        { path: 'dashboard', element: <RequirePermission permission="dashboard.view"><DashboardPage /></RequirePermission> },
        { path: 'reports', element: <RequirePermission permission="reports.view"><ReportsPage /></RequirePermission> },
        { path: 'portal', element: <RequirePermission permission="portal.view"><PortalOverviewPage /></RequirePermission> },
        { path: 'cadets', element: <div>Cadet register</div> },
        { path: 'cadets/:cadetId', element: <div>Cadet profile</div> },
        { path: 'flight-operations', element: <div>Flight register</div> },
        { path: 'flight-operations/new', element: <div>New flight</div> },
        { path: 'flight-operations/:flightId', element: <div>Flight detail</div> },
        { path: 'approvals', element: <div>Approvals</div> },
        { path: 'finance', element: <div>Finance</div> },
        { path: 'fleet', element: <div>Fleet</div> },
        { path: 'fleet/:aircraftId', element: <div>Aircraft</div> },
        { path: 'fuel', element: <div>Fuel</div> },
        { path: 'maintenance', element: <div>Maintenance</div> },
        { path: 'hr', element: <div>Staff</div> },
        { path: 'hr/:staffId', element: <div>Staff profile</div> },
        { path: 'documents', element: <div>Documents</div> },
        { path: 'training/progress', element: <div>Progress</div> },
        { path: 'users', element: <div>Users</div> },
        { path: 'settings', element: <div>Settings</div> },
        { path: 'audit', element: <div>Audit</div> },
        { path: 'portal/schedule/:flightId', element: <div>Portal flight</div> },
      ],
    },
  ], { initialEntries: [path] });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <WorkspaceRepositoryProvider repository={repository}>
          <AuthProvider>
            <AppSnackbarProvider>
              <RouterProvider router={router} />
            </AppSnackbarProvider>
          </AuthProvider>
        </WorkspaceRepositoryProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { ...view, store };
}

describe('role dashboards', () => {
  it('shows administration content to the super admin and hides operational counts', async () => {
    renderDashboard('/dashboard', 'user-super');
    expect(await screen.findByRole('heading', { name: 'Administration dashboard' })).toBeTruthy();
    expect(screen.getByText('Demonstration accounts').parentElement?.textContent).toContain('9');
    expect(screen.getByText('Academy Administrator')).toBeTruthy();
    expect(screen.getByText('Approved FLT-2401.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Users & Roles' })).toBeTruthy();
    expect(screen.queryByText('Active cadets')).toBeNull();
    expect(screen.queryByText('Outstanding fees')).toBeNull();
    expect(screen.queryByText('Flights today')).toBeNull();
  });

  it('shows academy-wide operations to the administrator, including fees and approval actions', async () => {
    const view = renderDashboard('/dashboard', 'user-admin');
    expect(await screen.findByRole('heading', { name: 'Academy dashboard' })).toBeTruthy();
    expect(screen.getByText('On hold').parentElement?.textContent).toContain('1');
    expect(screen.getByText('Aircraft not available').parentElement?.textContent).toContain('2');
    expect(screen.getByText('Overdue accounts').parentElement?.textContent).toContain('2');
    expect(screen.getByText(inr(view.store.financeSnapshot().outstanding))).toBeTruthy();
    expect(screen.getByText(/Kochi Jet-A1 tank/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve FLT-2403' })).toBeTruthy();
    expect(screen.queryByText('September')).toBeNull();
  });

  it('keeps operations read-only on approvals and shows planning blockers', async () => {
    renderDashboard('/dashboard', 'user-ops');
    expect(await screen.findByRole('heading', { name: 'Operations dashboard' })).toBeTruthy();
    expect(screen.getAllByText('FLT-2405').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/overlaps FLT-2404/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Read only/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Approve FLT-2403' })).toBeNull();
    expect(screen.queryByText('Outstanding fees')).toBeNull();
    expect(screen.queryByText('Billed')).toBeNull();
    expect(screen.getByRole('link', { name: 'Schedule flight' })).toBeTruthy();
  });

  it('lets the chief flying instructor decide a flight and hides fleet and finance', async () => {
    renderDashboard('/dashboard', 'user-cfi');
    expect(await screen.findByRole('heading', { name: 'Training dashboard' })).toBeTruthy();
    expect(screen.getByText('No assessments are saved.')).toBeTruthy();
    expect(screen.getByText('Medical certificate (demo)')).toBeTruthy();
    expect(screen.queryByText('Aircraft available')).toBeNull();
    expect(screen.queryByText('Outstanding fees')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Approve FLT-2403' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    expect(await screen.findByText('A comment is required.')).toBeTruthy();
  });

  it('scopes the instructor dashboard to assigned cadets and flights', async () => {
    renderDashboard('/dashboard', 'user-arun');
    expect(await screen.findByRole('heading', { name: 'Instructor dashboard' })).toBeTruthy();
    expect(screen.getByText('Assigned active cadets').parentElement?.textContent).toContain('1');
    expect(screen.getByText('Aarav Menon')).toBeTruthy();
    expect(screen.queryByText('Ishan Pillai')).toBeNull();
    expect(screen.getByText('36% illustrative · 29.8 h recorded')).toBeTruthy();
    expect(screen.getByText('FLT-2401')).toBeTruthy();
    expect(screen.queryByText(/Unknown cadet/)).toBeNull();
    expect(screen.getAllByText(/Cadet outside assigned list/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Diya Nair/)).toBeNull();
    expect(screen.queryByText(/Rohan Varma/)).toBeNull();
    expect(screen.queryByText('Pending approvals')).toBeNull();
    expect(screen.queryByText('Aircraft available')).toBeNull();
    expect(screen.getByText('No flights in this list.')).toBeTruthy();
  });

  it('splits maintenance work orders into assigned and all open orders', async () => {
    renderDashboard('/dashboard', 'user-maint');
    expect(await screen.findByRole('heading', { name: 'Maintenance dashboard' })).toBeTruthy();
    expect(screen.getAllByText('Open defects')[0]?.parentElement?.textContent).toContain('1');
    expect(screen.getByText('Open work orders').parentElement?.textContent).toContain('1');
    expect(screen.getAllByText('WO-2408').length).toBe(2);
    expect(screen.getByText('Insurance schedule (demo)')).toBeTruthy();
    expect(screen.queryByText('Active cadets')).toBeNull();
    expect(screen.queryByText('Outstanding')).toBeNull();
    expect(screen.getAllByText(/not an airworthiness decision/i).length).toBeGreaterThan(0);
  });

  it('shows finance totals and hides flight metrics', async () => {
    const view = renderDashboard('/dashboard', 'user-fin');
    const snapshot = view.store.financeSnapshot();
    expect(await screen.findByRole('heading', { name: 'Finance dashboard' })).toBeTruthy();
    expect(screen.getByText('Billed').parentElement?.textContent).toContain(inr(snapshot.billed));
    expect(screen.getByText('Collected').parentElement?.textContent).toContain(inr(snapshot.collected));
    expect(screen.getByText('Ishan Pillai')).toBeTruthy();
    expect(screen.queryByText('Flights today')).toBeNull();
    expect(screen.queryByText('Aircraft available')).toBeNull();
    expect(screen.queryByText('Pending approvals')).toBeNull();
  });

  it('shows staff labels and leave without merging them into one unavailable count', async () => {
    renderDashboard('/dashboard', 'user-hr');
    expect(await screen.findByRole('heading', { name: 'Staff dashboard' })).toBeTruthy();
    expect(screen.getByText('Staff').parentElement?.textContent).toContain('9');
    expect(screen.getAllByText('Farhan Iqbal').length).toBeGreaterThan(0);
    expect(screen.getByText(/Demo leave block/)).toBeTruthy();
    expect(screen.getByText('No upcoming unavailable blocks.')).toBeTruthy();
    expect(screen.getByText('Instructor record (demo)')).toBeTruthy();
    expect(screen.queryByText('Active cadets')).toBeNull();
    expect(screen.queryByText('Outstanding fees')).toBeNull();
    expect(screen.queryByText('Billed')).toBeNull();
  });

  it('adds the cadet completed-flight count without other cadets', async () => {
    renderDashboard('/portal', 'user-aarav');
    const labels = await screen.findAllByText('Completed flights');
    expect(labels.some((label) => label.parentElement?.textContent?.includes('1'))).toBe(true);
    expect(screen.getByText(/FLT-2409/)).toBeTruthy();
    expect(screen.queryByText('Diya Nair')).toBeNull();
    expect(screen.queryByText('Active cadets')).toBeNull();
  });
});

describe('report visibility', () => {
  it('hides fee and audit report data from roles that cannot view those modules', async () => {
    const fees = renderDashboard('/reports?report=fees', 'user-ops');
    expect(await screen.findByText('This report is not available')).toBeTruthy();
    expect(screen.queryByText('Not an accounting ledger.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fee collection' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Audit activity' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Demo CSV' })).toBeNull();
    fees.unmount();

    const audit = renderDashboard('/reports?report=audit', 'user-fin');
    expect(await screen.findByText('This report is not available')).toBeTruthy();
    expect(screen.queryByText('Approved FLT-2401.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Audit activity' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Fee collection' })).toBeTruthy();
    audit.unmount();

    renderDashboard('/reports?report=audit', 'user-super');
    expect(await screen.findByText('Approved FLT-2401.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fee collection' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Demo CSV' })).toBeNull();
  });
});
