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
import { FuelPage } from './FuelPage';

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

function renderFuel(path: string, userId: string, repository: WorkspaceRepository) {
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
        { path: 'fuel', element: <RequirePermission permission="fuel.view"><FuelPage /></RequirePermission> },
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

describe('fuel screen', () => {
  it('shows calculated stock, refuses an oversized issue, and keeps a receipt', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderFuel('/fuel', 'user-ops', repositoryFor(store));
    expect(await screen.findByText('4700 L')).toBeTruthy();
    expect(screen.getByText('1800 L')).toBeTruthy();
    expect(screen.getAllByText('Low stock')).toHaveLength(1);
    expect(screen.getByText('GRN-2401')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(await screen.findByText('Tank, type, and quantity are required.')).toBeTruthy();

    await chooseOption('Type', 'Issue');
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(await screen.findByText('That issue is larger than the calculated stock.')).toBeTruthy();
    expect(store.fuelBalance('tank-avgas')).toBe(4700);

    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '4700' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(await screen.findByText('Stock balance updated.')).toBeTruthy();
    expect(await screen.findByText('0 L')).toBeTruthy();
    expect(store.fuelBalance('tank-avgas')).toBe(0);

    await chooseOption('Type', 'Receipt');
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Reference'), { target: { value: 'GRN-TEST' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(await screen.findByText('GRN-TEST')).toBeTruthy();
    expect(store.fuelBalance('tank-avgas')).toBe(100);
    view.unmount();

    renderFuel('/fuel', 'user-ops', repositoryFor(store));
    expect(await screen.findByText('100 L')).toBeTruthy();
    expect(screen.getByText('GRN-TEST')).toBeTruthy();
  });

  it('requires an adjustment reason and clears the jet low-stock chip after a receipt', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderFuel('/fuel', 'user-admin', repositoryFor(store));
    expect(await screen.findByText('Low stock')).toBeTruthy();
    await chooseOption('Type', 'Adjustment');
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(await screen.findByText('An adjustment needs a reason.')).toBeTruthy();

    await chooseOption('Tank', 'Kochi Jet-A1 tank');
    await chooseOption('Type', 'Receipt');
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '800' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    await waitFor(() => {
      expect(store.fuelBalance('tank-jeta')).toBe(2600);
      expect(screen.queryByText('Low stock')).toBeNull();
    });
    expect(screen.getByText('2600 L')).toBeTruthy();
  });

  it('shows an error and an empty tank list', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const base = repositoryFor(store);
    const failed = renderFuel('/fuel', 'user-ops', {
      ...base,
      listTanks: async () => { throw new Error('offline'); },
    });
    expect(await screen.findByText('Fuel records did not load')).toBeTruthy();
    failed.unmount();

    renderFuel('/fuel', 'user-ops', { ...base, listTanks: async () => [], listFuelTransactions: async () => [] });
    expect(await screen.findByText('No tanks are in this workspace')).toBeTruthy();
    expect(screen.getByText('No fuel transactions are recorded.')).toBeTruthy();
  });
});
