// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { AppSnackbarProvider } from '../../components/feedback/snackbar';
import { SESSION_STORAGE_KEY } from '../../domain/demoData';
import { RequireAuth } from '../auth/RequireAuth';
import { RequirePermission } from '../auth/RequirePermission';
import { AuthProvider } from '../auth/AuthProvider';
import { DashboardPage } from '../dashboard/DashboardPage';
import { AircraftDetailPage } from '../fleet/AircraftDetailPage';
import { FleetListPage } from '../fleet/FleetListPage';
import { FuelPage } from '../fuel/FuelPage';
import { MaintenancePage } from '../maintenance/MaintenancePage';
import { StaffDetailPage } from '../staff/StaffDetailPage';
import { StaffListPage } from '../staff/StaffListPage';
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore } from '../../services/repositories/workspaceStore';
import { theme } from '../../theme/theme';

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

function renderPath(path: string, userId: string) {
  localStorage.setItem(SESSION_STORAGE_KEY, userId);
  const store = createWorkspaceStore(createMemoryStorage());
  const repository = createMockWorkspaceRepository({ store, wait: async () => {} });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([
    { path: '/login', element: <div>Sign in</div> },
    {
      path: '/',
      element: <RequireAuth><Outlet /></RequireAuth>,
      children: [
        { path: 'dashboard', element: <RequirePermission permission="dashboard.view"><DashboardPage /></RequirePermission> },
        { path: 'fleet/:aircraftId', element: <RequirePermission permission="fleet.view"><AircraftDetailPage /></RequirePermission> },
        { path: 'fleet', element: <RequirePermission permission="fleet.view"><FleetListPage /></RequirePermission> },
        { path: 'maintenance', element: <RequirePermission permission="maintenance.view"><MaintenancePage /></RequirePermission> },
        { path: 'fuel', element: <RequirePermission permission="fuel.view"><FuelPage /></RequirePermission> },
        { path: 'hr/:staffId', element: <RequirePermission permission="staff.view"><StaffDetailPage /></RequirePermission> },
        { path: 'hr', element: <RequirePermission permission="staff.view"><StaffListPage /></RequirePermission> },
      ],
    },
  ], { initialEntries: [path] });
  return render(
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
}

describe('operational resource permissions', () => {
  it('denies routes the role map does not grant', async () => {
    const denied: Array<[string, string]> = [
      ['/fleet', 'user-cfi'],
      ['/fleet/ac-c172-01', 'user-arun'],
      ['/maintenance', 'user-arun'],
      ['/maintenance', 'user-fin'],
      ['/maintenance', 'user-hr'],
      ['/maintenance', 'user-super'],
      ['/maintenance', 'user-aarav'],
      ['/fuel', 'user-cfi'],
      ['/fuel', 'user-maint'],
      ['/fuel', 'user-fin'],
      ['/hr', 'user-arun'],
      ['/hr', 'user-maint'],
      ['/hr/staff-arun', 'user-super'],
      ['/hr/staff-arun', 'user-aarav'],
    ];
    for (const [path, userId] of denied) {
      const view = renderPath(path, userId);
      expect(await screen.findByText('Access limited')).toBeTruthy();
      view.unmount();
    }
  });

  it('keeps view and mutation actions separate', async () => {
    const opsFleet = renderPath('/fleet/ac-c172-01', 'user-ops');
    expect(await screen.findByRole('heading', { name: 'NFA-C172-01' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Update status' })).toBeNull();
    opsFleet.unmount();

    const cfiStaff = renderPath('/hr/staff-arun', 'user-cfi');
    expect(await screen.findByRole('heading', { name: 'Arun Menon' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add block' })).toBeNull();
    cfiStaff.unmount();

    const hrStaff = renderPath('/hr/staff-arun', 'user-hr');
    expect(await screen.findByRole('button', { name: 'Add block' })).toBeTruthy();
    hrStaff.unmount();

    const maintFuel = renderPath('/fuel', 'user-admin');
    expect(await screen.findByRole('button', { name: 'Save transaction' })).toBeTruthy();
    maintFuel.unmount();

    renderPath('/dashboard', 'user-maint');
    expect(await screen.findByText('Aircraft available')).toBeTruthy();
    expect(screen.getByText('Aircraft available').parentElement?.textContent).toContain('2');
    expect(screen.getAllByText('Open defects').length).toBeGreaterThan(0);
    expect(screen.queryByText('Active cadets')).toBeNull();
    expect(screen.queryByText('Not shown for this role')).toBeNull();
  });
});
