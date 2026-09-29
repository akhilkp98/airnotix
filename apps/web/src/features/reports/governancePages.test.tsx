// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { AppSnackbarProvider } from '../../components/feedback/snackbar';
import { DEMO_PASSWORD, SESSION_STORAGE_KEY } from '../../domain/demoData';
import { RequireAuth } from '../auth/RequireAuth';
import { RequirePermission } from '../auth/RequirePermission';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { AuditPage } from '../audit/AuditPage';
import { ReportsPage } from './ReportsPage';
import { SettingsPage } from '../settings/SettingsPage';
import { UsersPage } from '../users/UsersPage';
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore, type WorkspaceStore } from '../../services/repositories/workspaceStore';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { theme } from '../../theme/theme';
import { chooseOption } from '../../test/chooseOption';
import { buildReport, EMPTY_REPORT_FILTERS, reportToCsv } from './reportRules';

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

function renderAt(path: string, userId: string, repository: WorkspaceRepository) {
  localStorage.setItem(SESSION_STORAGE_KEY, userId);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/login', element: <div>Sign in</div> },
    {
      path: '/',
      element: <RequireAuth><Outlet /></RequireAuth>,
      children: [
        { path: 'reports', element: <RequirePermission permission="reports.view"><ReportsPage /></RequirePermission> },
        { path: 'audit', element: <RequirePermission permission="audit.view"><AuditPage /></RequirePermission> },
        { path: 'settings', element: <RequirePermission permission="settings.manage"><SettingsPage /></RequirePermission> },
        { path: 'users', element: <RequirePermission permission="users.manage"><UsersPage /></RequirePermission> },
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

describe('reports', () => {
  it('filters the roster and flight-hour rows and builds a csv from those rows', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderAt('/reports', 'user-fin', repositoryFor(store));
    expect(await screen.findByText('Aarav Menon')).toBeTruthy();
    expect(screen.getByText('29.8')).toBeTruthy();
    await chooseOption('Course', 'PPL Training');
    expect(await screen.findByText('Rohan Varma')).toBeTruthy();
    expect(screen.queryByText('Aarav Menon')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Flight hours' }));
    expect(await screen.findByText('FLT-2409')).toBeTruthy();
    expect(screen.getByText('Completed hours').parentElement?.textContent).toContain('1.4');
    await chooseOption('Instructor', 'Nisha Varghese');
    expect(await screen.findByText('No rows match these filters.')).toBeTruthy();

    const csv = reportToCsv(buildReport(store.reportRecords(), 'hours', EMPTY_REPORT_FILTERS));
    expect(csv).toContain('"FLT-2409"');
    expect(csv.startsWith('"Reference","Cadet","Hours"')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Demo CSV' }));
    view.unmount();

    const hidden = renderAt('/reports', 'user-super', repositoryFor(store));
    expect(await screen.findByText('Aarav Menon')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Demo CSV' })).toBeNull();
    hidden.unmount();
  });

  it('shows an empty report and an error', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const base = repositoryFor(store);
    const empty = renderAt('/reports?report=hours', 'user-admin', {
      ...base,
      reportRecords: async () => ({ ...store.reportRecords(), flights: [] }),
    });
    expect(await screen.findByText('No rows are in this report.')).toBeTruthy();
    empty.unmount();

    renderAt('/reports', 'user-admin', {
      ...base,
      reportRecords: async () => { throw new Error('offline'); },
    });
    expect(await screen.findByText('The report did not load')).toBeTruthy();
  });
});

describe('audit, settings, and users', () => {
  it('shows seed events separately from a newly recorded action', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    store.addExpense({ date: '2026-09-29', category: 'Fuel', description: 'Audit expense', amount: 10 }, { id: 'user-fin', name: 'Priya Shah', email: 'priya.shah@northstar.example', role: 'finance' });
    const view = renderAt('/audit', 'user-admin', repositoryFor(store));
    expect(await screen.findByText('Approved FLT-2401.')).toBeTruthy();
    expect(screen.getAllByText('Seed').length).toBe(2);
    expect(screen.getByText('Fuel: Audit expense.')).toBeTruthy();
    expect(screen.getAllByText('Recorded').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Ravi' } });
    expect(await screen.findByText('Opened a demo defect for NFA-DA40-01.')).toBeTruthy();
    expect(screen.queryByText('Fuel: Audit expense.')).toBeNull();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '' } });
    await chooseOption('Action', 'Flight approved');
    await waitFor(() => expect(screen.queryByText('Opened a demo defect for NFA-DA40-01.')).toBeNull());
    expect(screen.getByText('Approved FLT-2401.')).toBeTruthy();
    view.unmount();

    renderAt('/audit', 'user-admin', {
      ...repositoryFor(store),
      listAudit: async () => { throw new Error('offline'); },
    });
    expect(await screen.findByText('The audit history did not load')).toBeTruthy();
  });

  it('saves academy settings and keeps the branch', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderAt('/settings', 'user-admin', repositoryFor(store));
    const name = await screen.findByLabelText(/Academy name/);
    fireEvent.change(name, { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Academy name is required.')).toBeTruthy();
    expect((await repositoryFor(store).getAcademy()).name).toBe('Northstar Flight Academy');

    fireEvent.change(screen.getByLabelText(/Academy name/), { target: { value: 'Northstar Demo' } });
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Settings saved in this browser.')).toBeTruthy();
    expect(screen.getByText(/Branch: Kochi Training Base/)).toBeTruthy();
    view.unmount();

    renderAt('/settings', 'user-super', repositoryFor(store));
    expect(await screen.findByDisplayValue('Northstar Demo')).toBeTruthy();
    expect(screen.getByDisplayValue('INR')).toBeTruthy();
  });

  it('adds a demo user, keeps the administrator, and signs in with the shared password', async () => {
    const store = createWorkspaceStore(window.localStorage);
    const view = renderAt('/users', 'user-admin', repositoryFor(store));
    expect(await screen.findByText('Meera Krishnan')).toBeTruthy();
    expect(screen.getByText('settings.manage')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }));
    expect(await screen.findByText('Name, email, and role are required.')).toBeTruthy();
    expect(screen.getByText('Meera Krishnan')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Leela Demo' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'leela.demo@northstar.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }));
    expect(await screen.findByText('Demo user added.')).toBeTruthy();
    expect(screen.getByText('Leela Demo')).toBeTruthy();
    expect(screen.getByText('Meera Krishnan')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Finance Officer' }));
    await waitFor(() => expect(screen.queryByText('settings.manage')).toBeNull());
    expect(screen.getByText('finance.view')).toBeTruthy();
    view.unmount();
    localStorage.removeItem(SESSION_STORAGE_KEY);

    function Probe() {
      const { signIn, user } = useAuth();
      return (
        <button type="button" onClick={() => signIn('leela.demo@northstar.example', DEMO_PASSWORD)}>
          {user?.name ?? 'signed-out'}
        </button>
      );
    }
    render(
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'signed-out' }));
    expect(await screen.findByRole('button', { name: 'Leela Demo' })).toBeTruthy();
  });
});

describe('administration access', () => {
  it('denies routes the role map does not grant', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const denied: Array<[string, string]> = [
      ['/reports', 'user-arun'],
      ['/reports', 'user-aarav'],
      ['/audit', 'user-ops'],
      ['/audit', 'user-cfi'],
      ['/audit', 'user-fin'],
      ['/audit', 'user-hr'],
      ['/audit', 'user-maint'],
      ['/audit', 'user-aarav'],
      ['/settings', 'user-ops'],
      ['/settings', 'user-fin'],
      ['/settings', 'user-hr'],
      ['/settings', 'user-aarav'],
      ['/users', 'user-cfi'],
      ['/users', 'user-fin'],
      ['/users', 'user-hr'],
      ['/users', 'user-aarav'],
    ];
    for (const [path, userId] of denied) {
      const view = renderAt(path, userId, repository);
      expect(await screen.findByText('Access limited')).toBeTruthy();
      view.unmount();
    }
  });
});
