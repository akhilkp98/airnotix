// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { AppSnackbarProvider } from '../../components/feedback/snackbar';
import { recordedAircraftHours, recordedCadetHours } from '../../domain/calculations';
import { findDemoUser, SESSION_STORAGE_KEY } from '../../domain/demoData';
import { RequireAuth } from '../auth/RequireAuth';
import { RequirePermission } from '../auth/RequirePermission';
import { AuthProvider } from '../auth/AuthProvider';
import { CadetProfilePage } from '../cadets/CadetProfilePage';
import { DashboardPage } from '../dashboard/DashboardPage';
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore, type WorkspaceStore } from '../../services/repositories/workspaceStore';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { theme } from '../../theme/theme';
import { chooseOption } from '../../test/chooseOption';
import { FlightDetailPage } from './FlightDetailPage';
import { FlightFormPage } from './FlightFormPage';
import { FlightSchedulePage } from './FlightSchedulePage';

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

function renderFlights(path: string, userId: string, repository: WorkspaceRepository) {
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
        { path: 'flight-operations/new', element: <RequirePermission permission="flights.create"><FlightFormPage /></RequirePermission> },
        { path: 'flight-operations/:flightId', element: <RequirePermission permission="flights.view"><FlightDetailPage /></RequirePermission> },
        { path: 'flight-operations', element: <RequirePermission permission="flights.view"><FlightSchedulePage /></RequirePermission> },
        { path: 'cadets/:cadetId', element: <RequirePermission permission="cadets.view"><CadetProfilePage /></RequirePermission> },
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

function repositoryFor(store: WorkspaceStore, patch?: Partial<WorkspaceRepository>) {
  return { ...createMockWorkspaceRepository({ store, wait: async () => {} }), ...patch };
}

describe('flight screens', () => {
  it('renders the demo week and filters by status and day', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderFlights('/flight-operations', 'user-ops', repositoryFor(store));
    expect(await screen.findByText('FLT-2401')).toBeTruthy();
    expect(screen.getByText('FLT-2409')).toBeTruthy();
    expect(screen.getByText('FLT-2410')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Schedule flight' })).toBeTruthy();

    await chooseOption('Status', 'Cancelled');
    await waitFor(() => {
      expect(screen.getByText('FLT-2410')).toBeTruthy();
      expect(screen.queryByText('FLT-2401')).toBeNull();
    });

    await chooseOption('Status', 'All statuses');
    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    await waitFor(() => {
      expect(screen.getByText('FLT-2401')).toBeTruthy();
      expect(screen.queryByText('FLT-2409')).toBeNull();
    });
  });

  it('shows loading, empty, error, and an unknown flight', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const base = repositoryFor(store);
    const loading = renderFlights('/flight-operations', 'user-admin', {
      ...base,
      listFlights: async () => {
        await gate;
        return base.listFlights();
      },
    });
    expect(await screen.findByRole('progressbar', { name: 'Loading flights' })).toBeTruthy();
    release();
    expect(await screen.findByText('FLT-2401')).toBeTruthy();
    loading.unmount();

    const empty = renderFlights('/flight-operations', 'user-admin', { ...base, listFlights: async () => [] });
    expect(await screen.findByText('No flights are in this workspace')).toBeTruthy();
    empty.unmount();

    const failed = renderFlights('/flight-operations', 'user-admin', {
      ...base,
      listFlights: async () => {
        throw new Error('offline');
      },
    });
    expect(await screen.findByText('The flight register did not load')).toBeTruthy();
    failed.unmount();

    renderFlights('/flight-operations/missing-flight', 'user-admin', base);
    expect(await screen.findByText('That flight is not in the demo calendar.')).toBeTruthy();
  });

  it('saves a draft with an overlap and refuses submission', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderFlights('/flight-operations/flt-2405', 'user-ops', repositoryFor(store));
    expect(await screen.findByRole('heading', { name: 'FLT-2405' })).toBeTruthy();
    expect(screen.getByText(/Instructor overlaps FLT-2404/)).toBeTruthy();
    expect(screen.getByText(/Aircraft overlaps FLT-2404/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));
    expect(await screen.findByText(/Instructor overlaps FLT-2404/)).toBeTruthy();
    expect(store.getFlight('flt-2405')?.status).toBe('Draft');

    fireEvent.click(screen.getByRole('link', { name: 'Edit draft' }));
    expect(await screen.findByRole('button', { name: 'Save draft' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Draft saved.')).toBeTruthy();
    expect(store.getFlight('flt-2405')?.status).toBe('Draft');
  });

  it('shows leave, aircraft restriction, and a qualification warning', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const restricted = renderFlights('/flight-operations/flt-2407', 'user-admin', repositoryFor(store));
    expect(await screen.findByText(/Instructor is marked leave/)).toBeTruthy();
    expect(screen.getByText(/planning constraint, not a serviceability decision/)).toBeTruthy();
    expect(screen.getByText(/informational only/)).toBeTruthy();
    restricted.unmount();

    renderFlights('/flight-operations/flt-2403', 'user-cfi', repositoryFor(store));
    expect(await screen.findByText(/informational only/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.queryByText(/planning constraint, not a serviceability decision/)).toBeNull();
  });

  it('approves a warning-only flight and rejects another while an overlap remains', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const approved = renderFlights('/flight-operations/flt-2403', 'user-cfi', repository);
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approved' }));
    expect(await screen.findByText('A comment is required.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^Comment/), { target: { value: 'Approved for the demo.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    expect(await screen.findByText('Flight approved.')).toBeTruthy();
    await waitFor(() => expect(store.getFlight('flt-2403')?.status).toBe('Approved'));
    approved.unmount();

    const overlapped = createWorkspaceStore(createMemoryStorage());
    overlapped.saveFlightDraft({
      date: '2026-09-29',
      start: '11:15',
      end: '12:00',
      cadetId: 'cadet-aarav',
      instructorId: 'staff-arun',
      aircraftId: 'ac-c172-01',
      itemId: 'item-stall',
    }, findDemoUser('user-ops') ?? undefined);
    renderFlights('/flight-operations/flt-2403', 'user-cfi', repositoryFor(overlapped));
    expect(await screen.findByText(/Aircraft overlaps/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(overlapped.getFlight('flt-2403')?.status).toBe('Awaiting approval');
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.change(await screen.findByLabelText(/^Comment/), { target: { value: 'Overlap remains' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejected' }));
    expect(await screen.findByText('Flight rejected.')).toBeTruthy();
    await waitFor(() => expect(overlapped.getFlight('flt-2403')?.status).toBe('Rejected'));
    expect(overlapped.getFlight('flt-2403')?.approval?.comment).toBe('Overlap remains');
  });

  it('validates a new draft and keeps it after another read', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const form = renderFlights('/flight-operations/new', 'user-ops', repository);
    expect(await screen.findByRole('button', { name: 'Save draft' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Cadet is required.')).toBeTruthy();
    expect(store.listFlights()).toHaveLength(9);

    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: '2026-10-05' } });
    await chooseOption(/^Cadet/, 'Aarav Menon');
    await chooseOption(/^Instructor/, 'Arun Menon');
    await chooseOption(/^Aircraft/, /NFA-C172-02/);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Draft saved.')).toBeTruthy();
    expect(store.listFlights()).toHaveLength(10);
    const created = store.listFlights().find((flight) => flight.date === '2026-10-05');
    expect(created?.status).toBe('Draft');
    expect(created?.cadetId).toBe('cadet-aarav');
    form.unmount();

    renderFlights('/flight-operations?view=day&date=2026-10-05', 'user-ops', repository);
    expect(await screen.findByText(created?.reference ?? '')).toBeTruthy();
  });

  it('completes an assigned flight once, corrects hours, and updates the cadet profile', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    renderFlights('/flight-operations/flt-2401?complete=1', 'user-arun', repository);
    expect(await screen.findByRole('button', { name: 'Submit completion' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Actual hours'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit completion' }));
    expect(await screen.findByText(/Completion recorded/)).toBeTruthy();
    await waitFor(() => expect(store.getFlight('flt-2401')?.status).toBe('Completed'));
    expect(store.getCadet('cadet-aarav', null)?.completedRequired).toBe(37);
    expect(recordedCadetHours(store.load(), 'cadet-aarav')).toBe(31.3);
    expect(recordedAircraftHours(store.load(), 'ac-c172-01')).toBe(4123.4);

    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));
    expect(await screen.findByText('A revised hour value and a reason are required.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Revised hours'), { target: { value: '1.6' } });
    fireEvent.change(screen.getByLabelText(/^Reason/), { target: { value: 'Revised block time' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));
    expect(await screen.findByText('Correction stored in the activity log.')).toBeTruthy();
    await waitFor(() => expect(store.getFlight('flt-2401')?.actual?.hours).toBe(1.6));
    expect(store.getCadet('cadet-aarav', null)?.completedRequired).toBe(37);
    expect(recordedCadetHours(store.load(), 'cadet-aarav')).toBe(31.4);
    expect(store.completeFlight('flt-2401', {
      start: '06:30',
      end: '08:00',
      hours: 2,
      outcome: 'Satisfactory',
    }, findDemoUser('user-arun') ?? undefined).ok).toBe(false);
    expect(store.getFlight('flt-2401')?.actual?.hours).toBe(1.6);

    fireEvent.click(screen.getByRole('link', { name: 'Aarav Menon' }));
    expect(await screen.findByRole('heading', { name: 'Aarav Menon' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Flights' }));
    expect(await screen.findByRole('link', { name: 'FLT-2401' })).toBeTruthy();
    expect(screen.getByText('1.6')).toBeTruthy();
  });

  it('stops an instructor completing someone else\'s flight', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderFlights('/flight-operations/flt-2402?complete=1', 'user-arun', repositoryFor(store));
    expect(await screen.findByRole('button', { name: 'Submit completion' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit completion' }));
    expect(await screen.findByText('Instructors can record completion only for their assigned flights.')).toBeTruthy();
    expect(store.getFlight('flt-2402')?.status).toBe('Approved');
  });

  it('applies route and action permissions', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const denied = renderFlights('/flight-operations', 'user-super', repository);
    expect(await screen.findByText('Access limited')).toBeTruthy();
    denied.unmount();

    const cadet = renderFlights('/flight-operations/flt-2401', 'user-aarav', repository);
    expect(await screen.findByText('Access limited')).toBeTruthy();
    cadet.unmount();

    const maintenance = renderFlights('/flight-operations/new', 'user-maint', repository);
    expect(await screen.findByText('Access limited')).toBeTruthy();
    maintenance.unmount();

    const instructor = renderFlights('/flight-operations', 'user-arun', repository);
    expect(await screen.findByText('FLT-2401')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Schedule flight' })).toBeNull();
    instructor.unmount();

    const operations = renderFlights('/flight-operations/flt-2403', 'user-ops', repository);
    expect(await screen.findByRole('heading', { name: 'FLT-2403' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Record completion' })).toBeNull();
    operations.unmount();

    const dashboard = renderFlights('/dashboard', 'user-ops', repository);
    expect((await screen.findByText('Flights today')).parentElement?.textContent).toContain('3');
    expect(screen.getAllByText('Pending approvals')[0]?.parentElement?.textContent).toContain('1');
    expect(screen.getByText('Active cadets').parentElement?.textContent).toContain('6');
    expect(screen.getByText('Aircraft available').parentElement?.textContent).toContain('2');
    expect(screen.queryByText('Outstanding fees')).toBeNull();
    dashboard.unmount();

    renderFlights('/dashboard', 'user-maint', repository);
    expect((await screen.findAllByText('Open defects')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Active cadets')).toBeNull();
    expect(screen.queryByText('Not shown for this role')).toBeNull();
  });
});
