// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { AppSnackbarProvider } from '../../components/feedback/snackbar';
import { inr } from '../../domain/calculations';
import { SESSION_STORAGE_KEY } from '../../domain/demoData';
import { RequireAuth } from '../auth/RequireAuth';
import { RequirePermission } from '../auth/RequirePermission';
import { AuthProvider } from '../auth/AuthProvider';
import { DashboardPage } from '../dashboard/DashboardPage';
import { ApprovalsPage } from '../approvals/ApprovalsPage';
import { DocumentsPage } from '../documents/DocumentsPage';
import { FinancePage } from '../finance/FinancePage';
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/login', element: <div>Sign in</div> },
    {
      path: '/',
      element: <RequireAuth><Outlet /></RequireAuth>,
      children: [
        { path: 'dashboard', element: <RequirePermission permission="dashboard.view"><DashboardPage /></RequirePermission> },
        { path: 'finance', element: <RequirePermission permission="finance.view"><FinancePage /></RequirePermission> },
        { path: 'documents', element: <RequirePermission permission="documents.view"><DocumentsPage /></RequirePermission> },
        { path: 'approvals', element: <RequirePermission permission="approvals.view"><ApprovalsPage /></RequirePermission> },
      ],
    },
  ], { initialEntries: [path] });
  return { store, ...render(
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
  ) };
}

describe('finance, document, and approval access', () => {
  it('denies routes the role map does not grant', async () => {
    const denied: Array<[string, string]> = [
      ['/finance', 'user-ops'],
      ['/finance', 'user-cfi'],
      ['/finance', 'user-arun'],
      ['/finance', 'user-maint'],
      ['/finance', 'user-hr'],
      ['/finance', 'user-super'],
      ['/finance', 'user-aarav'],
      ['/documents', 'user-super'],
      ['/documents', 'user-aarav'],
      ['/approvals', 'user-arun'],
      ['/approvals', 'user-maint'],
      ['/approvals', 'user-fin'],
      ['/approvals', 'user-hr'],
      ['/approvals', 'user-super'],
      ['/approvals', 'user-aarav'],
    ];
    for (const [path, userId] of denied) {
      const view = renderPath(path, userId);
      expect(await screen.findByText('Access limited')).toBeTruthy();
      view.unmount();
    }
  });

  it('shows outstanding fees to finance and hides the expense form from a view-only role', async () => {
    const finance = renderPath('/dashboard', 'user-fin');
    const outstanding = finance.store.financeSnapshot().outstanding;
    expect(await screen.findByText(inr(outstanding))).toBeTruthy();
    finance.unmount();

    const operations = renderPath('/dashboard', 'user-ops');
    expect(await screen.findByText('Active cadets')).toBeTruthy();
    expect(screen.queryByText('Outstanding fees')).toBeNull();
    operations.unmount();

    const admin = renderPath('/finance', 'user-admin');
    expect(await screen.findByRole('button', { name: 'Save expense' })).toBeTruthy();
    admin.unmount();
  });
});
