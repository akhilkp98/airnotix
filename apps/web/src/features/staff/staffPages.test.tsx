// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { AppSnackbarProvider } from '../../components/feedback/snackbar';
import { SESSION_STORAGE_KEY } from '../../domain/demoData';
import { RequireAuth } from '../auth/RequireAuth';
import { RequirePermission } from '../auth/RequirePermission';
import { AuthProvider } from '../auth/AuthProvider';
import { FlightDetailPage } from '../flights/FlightDetailPage';
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore, type WorkspaceStore } from '../../services/repositories/workspaceStore';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { theme } from '../../theme/theme';
import { StaffDetailPage } from './StaffDetailPage';
import { StaffListPage } from './StaffListPage';

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

function repositoryFor(store: WorkspaceStore, patch?: Partial<WorkspaceRepository>) {
  return { ...createMockWorkspaceRepository({ store, wait: async () => {} }), ...patch };
}

function renderStaff(path: string, userId: string, repository: WorkspaceRepository) {
  localStorage.setItem(SESSION_STORAGE_KEY, userId);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([
    { path: '/login', element: <div>Sign in</div> },
    {
      path: '/',
      element: <RequireAuth><Outlet /></RequireAuth>,
      children: [
        { path: 'hr/:staffId', element: <RequirePermission permission="staff.view"><StaffDetailPage /></RequirePermission> },
        { path: 'hr', element: <RequirePermission permission="staff.view"><StaffListPage /></RequirePermission> },
        { path: 'flight-operations/:flightId', element: <RequirePermission permission="flights.view"><FlightDetailPage /></RequirePermission> },
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
  return { ...view, router };
}

describe('staff availability screens', () => {
  it('lists staff and marks a qualification date before the demo day as informational', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderStaff('/hr', 'user-cfi', repositoryFor(store));
    expect(await screen.findByText('Farhan Iqbal')).toBeTruthy();
    expect(screen.getByText('Leela Krishnan')).toBeTruthy();
    expect(screen.getByText('Before the demo day. Informational only.')).toBeTruthy();
    expect(screen.getByText(/not authorisations/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add block' })).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: 'Farhan Iqbal' }));
    expect(await screen.findByText(/Dated before the demo day/)).toBeTruthy();
    expect(screen.getByText(/1 Oct 2026 13:00–18:00 · Leave · Demo leave block/)).toBeTruthy();
    expect(screen.getByText(/Instructor record \(demo\)/)).toBeTruthy();
    view.unmount();

    renderStaff('/flight-operations/flt-2403', 'user-cfi', repositoryFor(store));
    expect(await screen.findByText(/informational only/)).toBeTruthy();
    expect(store.getFlight('flt-2403')?.status).toBe('Awaiting approval');
  });

  it('saves a leave block and the open flight reads it without changing the flight', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderStaff('/flight-operations/flt-2401', 'user-admin', repositoryFor(store));
    expect(await screen.findByRole('heading', { name: 'FLT-2401' })).toBeTruthy();
    expect(screen.queryByText(/marked leave/)).toBeNull();

    await view.router.navigate('/hr/staff-arun');
    expect(await screen.findByRole('button', { name: 'Add block' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(await screen.findByText('Staff member, date, and times are required.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-29' } });
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '06:00' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '08:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(await screen.findByText('Availability saved. Scheduling will warn on an overlap.')).toBeTruthy();
    expect(await screen.findByText(/29 Sep 2026 06:00–08:00 · Leave · Demo leave/)).toBeTruthy();

    await view.router.navigate('/flight-operations/flt-2401');
    expect(await screen.findByText(/marked leave/)).toBeTruthy();
    expect(store.getFlight('flt-2401')?.status).toBe('Approved');
  });

  it('shows loading, empty, error, and an unknown staff member', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const base = repositoryFor(store);
    const loading = renderStaff('/hr', 'user-hr', {
      ...base,
      listStaff: async () => {
        await gate;
        return base.listStaff();
      },
    });
    expect(await screen.findByRole('progressbar', { name: 'Loading staff' })).toBeTruthy();
    release();
    loading.unmount();

    const empty = renderStaff('/hr', 'user-hr', { ...base, listStaff: async () => [] });
    expect(await screen.findByText('No staff are in this workspace')).toBeTruthy();
    empty.unmount();

    const failed = renderStaff('/hr', 'user-hr', {
      ...base,
      listStaff: async () => { throw new Error('offline'); },
    });
    expect(await screen.findByText('The staff register did not load')).toBeTruthy();
    failed.unmount();

    renderStaff('/hr/missing', 'user-hr', base);
    expect(await screen.findByText('Staff member not found.')).toBeTruthy();
  });
});
