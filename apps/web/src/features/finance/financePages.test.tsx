// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { AppSnackbarProvider } from '../../components/feedback/snackbar';
import { inr } from '../../domain/calculations';
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
import { chooseOption } from '../../test/chooseOption';
import { FinancePage } from './FinancePage';

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

function renderFinance(path: string, userId: string, repository: WorkspaceRepository) {
  localStorage.setItem(SESSION_STORAGE_KEY, userId);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/login', element: <div>Sign in</div> },
    {
      path: '/',
      element: <RequireAuth><Outlet /></RequireAuth>,
      children: [
        { path: 'finance', element: <RequirePermission permission="finance.view"><FinancePage /></RequirePermission> },
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

describe('finance screen', () => {
  it('shows derived totals, filters overdue accounts, and records an expense', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderFinance('/finance', 'user-fin', repositoryFor(store));
    const snapshot = store.financeSnapshot();
    expect(await screen.findByText(inr(snapshot.billed))).toBeTruthy();
    expect(screen.getByText(inr(snapshot.collected))).toBeTruthy();
    expect(screen.getByText(inr(snapshot.outstanding))).toBeTruthy();
    expect(screen.getByText('Overdue accounts').parentElement?.textContent).toContain(String(snapshot.overdueAccounts));
    expect(screen.getByText(/not an accounting ledger/)).toBeTruthy();
    expect(screen.getByText(/No fee-adjustment action is defined/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ishan Pillai' })).toBeTruthy();

    await chooseOption('Account', 'Overdue');
    await waitFor(() => {
      expect(screen.getByText('Ishan Pillai')).toBeTruthy();
      expect(screen.getByText('Ananya Rao')).toBeTruthy();
      expect(screen.queryByText('Aarav Menon')).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(await screen.findByText('Date, category, description, and amount are required.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Fuel' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '2500' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Demo expense' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(await screen.findByText('Expense recorded.')).toBeTruthy();
    expect(store.listExpenses()[0]?.description).toBe('Demo expense');
    view.unmount();

    renderFinance('/finance', 'user-fin', repositoryFor(store));
    expect(await screen.findByText('Demo expense')).toBeTruthy();
  });

  it('records a cadet payment through the profile and refreshes the finance total', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const before = store.financeSnapshot().collected;
    const view = renderFinance('/cadets/cadet-ishan?tab=fees', 'user-fin', repositoryFor(store));
    expect(await screen.findByText('No payments.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(await screen.findByText('Cadet, amount, date, and method are required.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Amount (INR)'), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText('Reference'), { target: { value: 'UTR-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(await screen.findByText('Payment recorded. Collected and outstanding totals now include it.')).toBeTruthy();
    expect(await screen.findByText('UTR-1')).toBeTruthy();
    expect(store.financeSnapshot().collected).toBe(before + 10000);
    expect(store.getCadet('cadet-ishan', null)?.feeDueDate).toBe('2026-09-15');

    await view.router.navigate('/finance');
    expect(await screen.findByText(inr(before + 10000))).toBeTruthy();
  });

  it('shows loading, empty, and error states', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const base = repositoryFor(store);
    const loading = renderFinance('/finance', 'user-admin', {
      ...base,
      financeSnapshot: async () => {
        await gate;
        return base.financeSnapshot();
      },
    });
    expect(await screen.findByRole('progressbar', { name: 'Loading finance' })).toBeTruthy();
    release();
    loading.unmount();

    const empty = renderFinance('/finance', 'user-admin', {
      ...base,
      listFeeAccounts: async () => [],
      listExpenses: async () => [],
    });
    expect(await screen.findByText('No cadet accounts are in this workspace.')).toBeTruthy();
    expect(screen.getByText('No expenses are recorded.')).toBeTruthy();
    empty.unmount();

    renderFinance('/finance', 'user-admin', {
      ...base,
      financeSnapshot: async () => { throw new Error('offline'); },
    });
    expect(await screen.findByText('Finance records did not load')).toBeTruthy();
  });
});
