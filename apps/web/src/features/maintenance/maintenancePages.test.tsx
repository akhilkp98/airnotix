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
import { AircraftDetailPage } from '../fleet/AircraftDetailPage';
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore, type WorkspaceStore } from '../../services/repositories/workspaceStore';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { theme } from '../../theme/theme';
import { MaintenancePage } from './MaintenancePage';

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

function renderMaintenance(path: string, userId: string, repository: WorkspaceRepository) {
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
        { path: 'maintenance', element: <RequirePermission permission="maintenance.view"><MaintenancePage /></RequirePermission> },
        { path: 'fleet/:aircraftId', element: <RequirePermission permission="fleet.view"><AircraftDetailPage /></RequirePermission> },
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

describe('maintenance screens', () => {
  it('shows seed records, records a defect, and changes work status', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderMaintenance('/maintenance', 'user-admin', repositoryFor(store));
    expect(await screen.findByText('Oil weep noticed during the daily inspection demo record.')).toBeTruthy();
    expect(screen.getByText('WO-2408')).toBeTruthy();
    expect(screen.getByText('Open defects').parentElement?.textContent).toContain('1');
    expect(screen.getByText('Open work orders').parentElement?.textContent).toContain('1');
    expect(screen.getByText('Aircraft not available').parentElement?.textContent).toContain('2');
    expect(screen.getByText(/no scheduled-task records/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Record release WO-2408' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save defect' }));
    expect(await screen.findByText('Aircraft and description are required.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Loose panel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save defect' }));
    expect(await screen.findByText('Defect and work order recorded.')).toBeTruthy();
    expect(await screen.findByText('Loose panel')).toBeTruthy();
    expect(store.getAircraft('ac-c172-01')?.status).toBe('Available');
    expect(store.listWorkOrders()[0]?.assigneeId).toBe('staff-ravi');

    fireEvent.click(screen.getByRole('button', { name: 'WO-2408 Completed' }));
    await waitFor(() => {
      expect(store.listWorkOrders().find((item) => item.reference === 'WO-2408')?.status).toBe('Completed');
      expect(screen.getByText('Open work orders').parentElement?.textContent).toContain('1');
    });
  });

  it('records a release without returning the aircraft to Available', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderMaintenance('/maintenance', 'user-maint', repositoryFor(store));
    expect(await screen.findByRole('button', { name: 'Record release WO-2408' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Update status' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record release WO-2408' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(await screen.findByText('Release notes are required.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Release note'), { target: { value: 'Authorized entry only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(await screen.findByText('Release entry recorded.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(store.listWorkOrders().find((item) => item.reference === 'WO-2408')?.status).toBe('Release recorded');
    expect(store.getAircraft('ac-da40')?.status).toBe('Maintenance');

    await view.router.navigate('/fleet/ac-da40');
    expect(await screen.findByText(/Authorized release recorded by Ravi Das/)).toBeTruthy();
    expect(screen.getAllByText('Maintenance').length).toBeGreaterThan(0);
    expect(store.getAircraft('ac-da40')?.status).toBe('Maintenance');
  });

  it('hides defect actions from operations and shows an error state', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const base = repositoryFor(store);
    const ops = renderMaintenance('/maintenance', 'user-ops', base);
    expect(await screen.findByText('WO-2408')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save defect' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'WO-2408 Completed' })).toBeNull();
    ops.unmount();

    renderMaintenance('/maintenance', 'user-admin', {
      ...base,
      listDefects: async () => { throw new Error('offline'); },
    });
    expect(await screen.findByText('Maintenance records did not load')).toBeTruthy();
  });
});
