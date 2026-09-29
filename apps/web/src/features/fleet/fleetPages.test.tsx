// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { AppSnackbarProvider } from '../../components/feedback/snackbar';
import { SESSION_STORAGE_KEY } from '../../domain/demoData';
import { RequireAuth } from '../auth/RequireAuth';
import { RequirePermission } from '../auth/RequirePermission';
import { AuthProvider } from '../auth/AuthProvider';
import { DashboardPage } from '../dashboard/DashboardPage';
import { FlightDetailPage } from '../flights/FlightDetailPage';
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore, type WorkspaceStore } from '../../services/repositories/workspaceStore';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { theme } from '../../theme/theme';
import { chooseOption } from '../../test/chooseOption';
import { AircraftDetailPage } from './AircraftDetailPage';
import { FleetListPage } from './FleetListPage';

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

function renderFleet(path: string, userId: string, repository: WorkspaceRepository) {
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
        { path: 'dashboard', element: <RequirePermission permission="dashboard.view"><DashboardPage /></RequirePermission> },
        { path: 'fleet/:aircraftId', element: <RequirePermission permission="fleet.view"><AircraftDetailPage /></RequirePermission> },
        { path: 'fleet', element: <RequirePermission permission="fleet.view"><FleetListPage /></RequirePermission> },
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

describe('fleet screens', () => {
  it('lists aircraft, filters by status and identifier, and opens a detail record', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderFleet('/fleet', 'user-ops', repositoryFor(store));
    expect(await screen.findByText('NFA-C172-01')).toBeTruthy();
    expect(screen.getByText('4121.9')).toBeTruthy();
    expect(screen.getByText('NFA-DA40-01')).toBeTruthy();
    expect(screen.getByText(/configured number, not a maintenance programme/)).toBeTruthy();

    await chooseOption('Status', 'Maintenance');
    await waitFor(() => {
      expect(screen.getByText('NFA-DA40-01')).toBeTruthy();
      expect(screen.queryByText('NFA-C172-01')).toBeNull();
    });

    await chooseOption('Status', 'All statuses');
    fireEvent.change(screen.getByLabelText('Search aircraft'), { target: { value: 'DA42' } });
    await waitFor(() => {
      expect(screen.getByText('NFA-DA42-01')).toBeTruthy();
      expect(screen.queryByText('NFA-C172-02')).toBeNull();
    });

    fireEvent.click(screen.getByRole('link', { name: 'NFA-DA42-01' }));
    expect(await screen.findByText(/Demo restriction pending a document check/)).toBeTruthy();
    expect(screen.getByText(/not an airworthiness or release decision/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Update status' })).toBeNull();
    view.unmount();
  });

  it('shows loading, empty, error, and an unknown aircraft', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const base = repositoryFor(store);
    const loading = renderFleet('/fleet', 'user-admin', {
      ...base,
      listAircraft: async () => {
        await gate;
        return base.listAircraft();
      },
    });
    expect(await screen.findByRole('progressbar', { name: 'Loading aircraft' })).toBeTruthy();
    release();
    loading.unmount();

    const empty = renderFleet('/fleet', 'user-admin', { ...base, listAircraft: async () => [] });
    expect(await screen.findByText('No aircraft are in this workspace')).toBeTruthy();
    empty.unmount();

    const failed = renderFleet('/fleet', 'user-admin', {
      ...base,
      listAircraft: async () => { throw new Error('offline'); },
    });
    expect(await screen.findByText('The fleet register did not load')).toBeTruthy();
    failed.unmount();

    renderFleet('/fleet/missing', 'user-admin', base);
    expect(await screen.findByText('Aircraft not found.')).toBeTruthy();
  });

  it('updates planning status, keeps the flight, and refreshes the flight and dashboard', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderFleet('/dashboard', 'user-admin', repositoryFor(store));
    await waitFor(() => {
      expect(screen.getByText('Aircraft available').parentElement?.textContent).toContain('2');
    });

    await view.router.navigate('/flight-operations/flt-2402');
    expect(await screen.findByRole('heading', { name: 'FLT-2402' })).toBeTruthy();
    expect(screen.queryByText(/recorded as Maintenance/)).toBeNull();

    await view.router.navigate('/fleet/ac-c172-02');
    expect(await screen.findByRole('button', { name: 'Update status' })).toBeTruthy();
    expect(screen.queryByText(/Insurance schedule/)).toBeNull();
    await chooseOption('Status', 'Maintenance');
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    expect(await screen.findByText('A reason is required when the aircraft is not available.')).toBeTruthy();
    expect(store.getAircraft('ac-c172-02')?.status).toBe('Available');

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Hangar planning note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    expect(await screen.findByText('Aircraft planning status updated.')).toBeTruthy();
    expect(store.getAircraft('ac-c172-02')?.status).toBe('Maintenance');
    expect(store.getFlight('flt-2402')?.status).toBe('Approved');

    await view.router.navigate('/flight-operations/flt-2402');
    expect(await screen.findByText(/recorded as Maintenance/)).toBeTruthy();
    expect(screen.getByText(/Hangar planning note/)).toBeTruthy();
    expect(store.getFlight('flt-2402')?.status).toBe('Approved');

    await view.router.navigate('/dashboard');
    await waitFor(() => {
      expect(screen.getByText('Aircraft available').parentElement?.textContent).toContain('1');
    });
    expect(screen.getByText('Active cadets').parentElement?.textContent).toContain('6');
  });

  it('shows the insurance register row and linked flights for the first Cessna', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderFleet('/fleet/ac-c172-01', 'user-admin', repositoryFor(store));
    expect(await screen.findByText(/Insurance schedule \(demo\)/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'FLT-2401' })).toBeTruthy();
    expect(screen.getByText('4121.9')).toBeTruthy();
  });
});
