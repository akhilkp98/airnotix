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
import { NotificationButton } from '../notifications/NotificationButton';
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore, type WorkspaceStore } from '../../services/repositories/workspaceStore';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { theme } from '../../theme/theme';
import { ApprovalsPage } from './ApprovalsPage';

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

function renderApprovals(path: string, userId: string, repository: WorkspaceRepository) {
  localStorage.setItem(SESSION_STORAGE_KEY, userId);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/login', element: <div>Sign in</div> },
    {
      path: '/',
      element: (
        <RequireAuth>
          <NotificationButton />
          <Outlet />
        </RequireAuth>
      ),
      children: [
        { path: 'approvals', element: <RequirePermission permission="approvals.view"><ApprovalsPage /></RequirePermission> },
        { path: 'finance', element: <div>Finance records</div> },
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

describe('approvals and notifications', () => {
  it('rejects a pending flight with a comment and keeps the decision on the flight', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderApprovals('/approvals', 'user-cfi', repositoryFor(store));
    expect(await screen.findByText(/FLT-2403 · Meera Thomas/)).toBeTruthy();
    expect(screen.getByText('Medical certificate (demo)')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'FLT-2401' })).toBeTruthy();
    expect(screen.getAllByText(/Approved by Nisha Varghese/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Reject FLT-2403' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Rejected' }));
    expect(await screen.findByText('A comment is required.')).toBeTruthy();
    expect(store.getFlight('flt-2403')?.status).toBe('Awaiting approval');

    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Slot needs another look' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejected' }));
    expect(await screen.findByText('Flight rejected.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(store.getFlight('flt-2403')).toMatchObject({
      status: 'Rejected',
      approval: { comment: 'Slot needs another look', decision: 'Rejected' },
    });
    expect(await screen.findByText(/Rejected by Nisha Varghese: Slot needs another look/)).toBeTruthy();
    expect(screen.queryByText(/FLT-2403 · Meera Thomas/)).toBeNull();
  });

  it('hides decide buttons from operations and opens a role notification', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const ops = renderApprovals('/approvals', 'user-ops', repositoryFor(store));
    expect(await screen.findByText(/FLT-2403 · Meera Thomas/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve FLT-2403' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open flight' })).toBeTruthy();
    ops.unmount();

    const instructor = renderApprovals('/approvals', 'user-arun', repositoryFor(store));
    expect(await screen.findByText('Access limited')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText('No notifications for this role.')).toBeTruthy();
    instructor.unmount();

    renderApprovals('/approvals', 'user-fin', repositoryFor(store));
    expect(await screen.findByText('Access limited')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Notifications, 1 unread/ }));
    fireEvent.click(await screen.findByText('Fee due date passed'));
    expect(await screen.findByText('Finance records')).toBeTruthy();
    expect(store.listNotifications({ id: 'user-fin', name: 'Priya Shah', email: '', role: 'finance' })[0]?.read).toBe(true);
  });

  it('shows an empty queue and an error', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const base = repositoryFor(store);
    const empty = renderApprovals('/approvals', 'user-admin', {
      ...base,
      listPendingApprovals: async () => [],
      listRecordedDecisions: async () => [],
    });
    expect(await screen.findByText('No flights are awaiting approval.')).toBeTruthy();
    expect(screen.getByText('No decisions are recorded.')).toBeTruthy();
    empty.unmount();

    renderApprovals('/approvals', 'user-admin', {
      ...base,
      listPendingApprovals: async () => { throw new Error('offline'); },
    });
    expect(await screen.findByText('Approvals did not load')).toBeTruthy();
  });
});
