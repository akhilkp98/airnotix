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
import { CadetProfilePage } from '../cadets/CadetProfilePage';
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore, type WorkspaceStore } from '../../services/repositories/workspaceStore';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { theme } from '../../theme/theme';
import { DocumentsPage } from './DocumentsPage';

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

function renderDocuments(path: string, userId: string, repository: WorkspaceRepository) {
  localStorage.setItem(SESSION_STORAGE_KEY, userId);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/login', element: <div>Sign in</div> },
    {
      path: '/',
      element: <RequireAuth><Outlet /></RequireAuth>,
      children: [
        { path: 'documents', element: <RequirePermission permission="documents.view"><DocumentsPage /></RequirePermission> },
        { path: 'cadets/:cadetId', element: <RequirePermission permission="cadets.view"><CadetProfilePage /></RequirePermission> },
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

describe('document register', () => {
  it('filters the register, links the owner, and stores a review label', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderDocuments('/documents', 'user-cfi', repositoryFor(store));
    expect(await screen.findByText('Cadet enrolment form')).toBeTruthy();
    expect(screen.getByText(/Files are not stored in this browser/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /download/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /download/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
    await waitFor(() => {
      expect(screen.getByText('Medical certificate (demo)')).toBeTruthy();
      expect(screen.queryByText('Cadet enrolment form')).toBeNull();
    });

    fireEvent.change(screen.getByLabelText('Search documents'), { target: { value: 'medical' } });
    expect(screen.getByText('Medical certificate (demo)')).toBeTruthy();
    expect(screen.queryByText('Instructor record (demo)')).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: 'Sara Mathew' }));
    expect(await screen.findByRole('heading', { name: 'Sara Mathew' })).toBeTruthy();
    view.unmount();

    const review = renderDocuments('/documents?review=Pending', 'user-cfi', repositoryFor(store));
    fireEvent.click(await screen.findByRole('button', { name: 'Accept Medical certificate (demo)' }));
    expect(await screen.findByText('Review updated.')).toBeTruthy();
    await waitFor(() => {
      expect(store.listDocuments().find((item) => item.id === 'doc-2')?.review).toBe('Accepted');
    });
    review.unmount();

    const instructor = renderDocuments('/documents?review=Pending', 'user-arun', repositoryFor(store));
    expect(await screen.findByText('Instructor record (demo)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept Medical certificate (demo)' })).toBeNull();
    instructor.unmount();
  });

  it('shows an empty filter, an empty register, and an error', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const base = repositoryFor(store);
    const filtered = renderDocuments('/documents?review=Rejected', 'user-maint', base);
    expect(await screen.findByText('No documents in this filter.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept Medical certificate (demo)' })).toBeNull();
    filtered.unmount();

    const pending = renderDocuments('/documents?review=Pending', 'user-maint', base);
    expect(await screen.findByText('Medical certificate (demo)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept Medical certificate (demo)' })).toBeNull();
    pending.unmount();

    const empty = renderDocuments('/documents', 'user-hr', { ...base, listDocuments: async () => [] });
    expect(await screen.findByText('No documents are in this workspace.')).toBeTruthy();
    empty.unmount();

    renderDocuments('/documents', 'user-admin', {
      ...base,
      listDocuments: async () => { throw new Error('offline'); },
    });
    expect(await screen.findByText('The document register did not load')).toBeTruthy();
  });
});
