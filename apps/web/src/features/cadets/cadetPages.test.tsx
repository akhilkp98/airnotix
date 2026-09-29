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
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore, type WorkspaceStore } from '../../services/repositories/workspaceStore';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { theme } from '../../theme/theme';
import { chooseOption } from '../../test/chooseOption';
import { CadetFormPage } from './CadetFormPage';
import { CadetListPage } from './CadetListPage';
import { CadetProfilePage } from './CadetProfilePage';

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

function renderCadets(path: string, userId: string, repository: WorkspaceRepository) {
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
        { path: 'cadets/new', element: <RequirePermission permission="cadets.create"><CadetFormPage /></RequirePermission> },
        { path: 'cadets/:cadetId', element: <RequirePermission permission="cadets.view"><CadetProfilePage /></RequirePermission> },
        { path: 'cadets', element: <RequirePermission permission="cadets.view"><CadetListPage /></RequirePermission> },
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

describe('cadet screens', () => {
  it('renders the fixture register and filters it', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderCadets('/cadets', 'user-admin', repositoryFor(store));
    expect(await screen.findByText('NFA-2026-001')).toBeTruthy();
    expect(screen.getByText('NFA-2026-008')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Aarav Menon' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search cadets'), { target: { value: 'Diya' } });
    await waitFor(() => {
      expect(screen.getByText('NFA-2026-002')).toBeTruthy();
      expect(screen.queryByText('NFA-2026-001')).toBeNull();
    });

    fireEvent.change(screen.getByLabelText('Search cadets'), { target: { value: '' } });
    fireEvent.mouseDown(screen.getByLabelText('Status'));
    fireEvent.click(await screen.findByRole('option', { name: 'On Hold' }));
    await waitFor(() => {
      expect(screen.getByText('Ishan Pillai')).toBeTruthy();
      expect(screen.queryByText('Aarav Menon')).toBeNull();
    });
  });

  it('shows loading, empty, and error states', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const base = repositoryFor(store);
    const { unmount } = renderCadets('/cadets', 'user-admin', {
      ...base,
      listCadets: async (user) => {
        await gate;
        return base.listCadets(user);
      },
    });
    expect(await screen.findByRole('progressbar', { name: 'Loading cadets' })).toBeTruthy();
    release();
    expect(await screen.findByText('NFA-2026-001')).toBeTruthy();
    unmount();

    const empty = createWorkspaceStore(createMemoryStorage());
    const cleared = empty.load();
    cleared.cadets = [];
    empty.saveState(cleared);
    const emptyView = renderCadets('/cadets', 'user-admin', repositoryFor(empty));
    expect(await screen.findByText('No cadets are in this workspace')).toBeTruthy();
    emptyView.unmount();

    renderCadets('/cadets', 'user-admin', {
      ...repositoryFor(store),
      listCadets: async () => {
        throw new Error('offline');
      },
    });
    expect(await screen.findByText('The cadet register did not load')).toBeTruthy();
  });

  it('opens a profile and rejects an unknown id', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const { unmount } = renderCadets('/cadets/cadet-aarav', 'user-admin', repositoryFor(store));
    expect(await screen.findByRole('heading', { name: 'Aarav Menon' })).toBeTruthy();
    expect(screen.getByText('36%')).toBeTruthy();
    expect(screen.getByText('29.8')).toBeTruthy();
    expect(screen.getByText(/FLT-2401/)).toBeTruthy();
    unmount();

    renderCadets('/cadets/cadet-missing', 'user-admin', repositoryFor(store));
    expect(await screen.findByText('That cadet is not in this demo workspace.')).toBeTruthy();
  });

  it('validates enrolment, saves through the repository, and keeps the cadet after a new read', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const { unmount } = renderCadets('/cadets/new', 'user-admin', repository);
    expect(await screen.findByRole('button', { name: 'Save cadet' })).toBeTruthy();
    expect(screen.getByText(/15 Nov 2026/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save cadet' }));
    expect(await screen.findByText('First name, last name, course, and joining date are required.')).toBeTruthy();
    expect(screen.getByText('First name is required.')).toBeTruthy();
    expect(store.listCadets(null)).toHaveLength(8);

    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Cadet' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    await chooseOption(/Course/, 'PPL Training');
    fireEvent.click(screen.getByRole('button', { name: 'Save cadet' }));
    expect((await screen.findAllByText('Enter a valid email address, or leave it blank.')).length).toBeGreaterThan(0);
    expect(store.listCadets(null)).toHaveLength(8);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save cadet' }));
    expect(await screen.findByText('Cadet saved.')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'New Cadet' })).toBeTruthy();
    expect(screen.getByText(/NFA-2026-009/)).toBeTruthy();
    expect(store.listCadets(null).some((cadet) => cadet.code === 'NFA-2026-009' && cadet.feeDueDate === '2026-11-15')).toBe(true);
    unmount();

    renderCadets('/cadets', 'user-admin', repository);
    expect(await screen.findByText('NFA-2026-009')).toBeTruthy();
  });

  it('limits cadet access by the existing role map', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const adminDenied = renderCadets('/cadets', 'user-super', repository);
    expect(await screen.findByText('Access limited')).toBeTruthy();
    adminDenied.unmount();

    const cadetDenied = renderCadets('/cadets/new', 'user-aarav', repository);
    expect(await screen.findByText('Access limited')).toBeTruthy();
    cadetDenied.unmount();

    const operations = renderCadets('/cadets', 'user-ops', repository);
    expect(await screen.findByText('NFA-2026-001')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Add cadet' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add cadet' })).toBeNull();
    operations.unmount();

    const instructor = renderCadets('/cadets', 'user-arun', repository);
    expect(await screen.findByText('Aarav Menon')).toBeTruthy();
    expect(screen.getByText('Ishan Pillai')).toBeTruthy();
    expect(screen.queryByText('Diya Nair')).toBeNull();
    instructor.unmount();

    renderCadets('/cadets/cadet-diya', 'user-arun', repository);
    expect(await screen.findByText('Outside your assigned cadets')).toBeTruthy();
    expect(screen.queryByText('diya.nair@northstar.example')).toBeNull();
  });

  it('shows fee records for finance and hides that tab from operations', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const finance = renderCadets('/cadets/cadet-ishan', 'user-fin', repository);
    expect(await screen.findByRole('heading', { name: 'Ishan Pillai' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Fees' }));
    expect(await screen.findByText('Overdue')).toBeTruthy();
    expect(screen.getByText(/No payments/)).toBeTruthy();
    finance.unmount();

    renderCadets('/cadets/cadet-ishan', 'user-ops', repository);
    expect(await screen.findByRole('heading', { name: 'Ishan Pillai' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Fees' })).toBeNull();
  });

  it('requires a reason before a status change and keeps the new status', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const { unmount } = renderCadets('/cadets/cadet-aarav', 'user-admin', repository);
    expect(await screen.findByRole('heading', { name: 'Aarav Menon' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mark On Hold' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    expect(await screen.findByText('A reason is required for a status change.')).toBeTruthy();
    expect(store.getCadet('cadet-aarav', null)?.status).toBe('Active');

    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Demo hold' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    expect(await screen.findByText('Status updated.')).toBeTruthy();
    await waitFor(() => expect(store.getCadet('cadet-aarav', null)?.status).toBe('On Hold'));
    unmount();

    renderCadets('/cadets/cadet-aarav', 'user-admin', repository);
    expect(await screen.findByText('On Hold')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(await screen.findByText(/Demo hold/)).toBeTruthy();
  });
});
