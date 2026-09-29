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
import { WorkspaceRepositoryProvider } from '../../services/repositories/WorkspaceRepositoryProvider';
import { createMockWorkspaceRepository } from '../../services/repositories/mockWorkspaceRepository';
import { createMemoryStorage, createWorkspaceStore, type WorkspaceStore } from '../../services/repositories/workspaceStore';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { theme } from '../../theme/theme';
import { PortalDocumentsPage } from './PortalDocumentsPage';
import { PortalFeesPage } from './PortalFeesPage';
import { PortalFlightPage, PortalFlightsPage } from './PortalFlightsPage';
import { PortalNotificationsPage } from './PortalNotificationsPage';
import { PortalOverviewPage } from './PortalOverviewPage';
import { PortalProfilePage } from './PortalProfilePage';
import { PortalTrainingPage } from './PortalTrainingPage';

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

function renderPortal(path: string, userId: string, repository: WorkspaceRepository) {
  localStorage.setItem(SESSION_STORAGE_KEY, userId);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/login', element: <div>Sign in</div> },
    {
      path: '/',
      element: <RequireAuth><Outlet /></RequireAuth>,
      children: [
        { path: 'portal', element: <RequirePermission permission="portal.view"><PortalOverviewPage /></RequirePermission> },
        { path: 'portal/profile', element: <RequirePermission permission="portal.view"><PortalProfilePage /></RequirePermission> },
        { path: 'portal/training', element: <RequirePermission permission="portal.view"><PortalTrainingPage /></RequirePermission> },
        { path: 'portal/schedule/:flightId', element: <RequirePermission permission="portal.view"><PortalFlightPage /></RequirePermission> },
        { path: 'portal/schedule', element: <RequirePermission permission="portal.view"><PortalFlightsPage /></RequirePermission> },
        { path: 'portal/documents', element: <RequirePermission permission="portal.view"><PortalDocumentsPage /></RequirePermission> },
        { path: 'portal/fees', element: <RequirePermission permission="portal.view"><PortalFeesPage /></RequirePermission> },
        { path: 'portal/notifications', element: <RequirePermission permission="portal.view"><PortalNotificationsPage /></RequirePermission> },
        { path: 'finance', element: <RequirePermission permission="finance.view"><div>Finance records</div></RequirePermission> },
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

describe('cadet portal', () => {
  it('shows Aarav’s own summary and hides another cadet’s flight', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderPortal('/portal', 'user-aarav', repositoryFor(store));
    const fees = store.feeAccount('cadet-aarav');
    expect(await screen.findByText('Hello, Aarav')).toBeTruthy();
    expect(screen.getByText('36%')).toBeTruthy();
    expect(screen.getByText('29.8')).toBeTruthy();
    expect(screen.getByText(inr(fees?.outstanding ?? 0))).toBeTruthy();
    expect(screen.getAllByText(/FLT-2401/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/FLT-2402/)).toBeNull();
    expect(screen.queryByText('Morning dual')).toBeNull();
    expect(screen.queryByRole('button', { name: /Approve/ })).toBeNull();
    view.unmount();

    renderPortal('/portal/schedule/flt-2402', 'user-aarav', repositoryFor(store));
    expect(await screen.findByText('This flight is not on your schedule.')).toBeTruthy();
  });

  it('opens a released flight and lists training without an assessment form', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    store.saveAssessment({
      cadetId: 'cadet-aarav',
      itemId: 'item-circuits',
      outcome: 'Satisfactory',
      comments: 'Internal note',
      date: '2026-09-28',
    }, { id: 'user-cfi', name: 'Nisha Varghese', email: 'nisha.varghese@northstar.example', role: 'cfi' });
    const flights = renderPortal('/portal/schedule', 'user-aarav', repositoryFor(store));
    expect(await screen.findByText('FLT-2409')).toBeTruthy();
    expect(screen.getByText('FLT-2401')).toBeTruthy();
    expect(screen.queryByText('FLT-2402')).toBeNull();
    expect(screen.queryByRole('button', { name: /Complete/ })).toBeNull();
    flights.unmount();

    const detail = renderPortal('/portal/schedule/flt-2401', 'user-aarav', repositoryFor(store));
    expect(await screen.findByText('FLT-2401')).toBeTruthy();
    expect(screen.getByText('NFA-C172-01')).toBeTruthy();
    expect(screen.getByText('Arun Menon')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Reject/ })).toBeNull();
    detail.unmount();

    renderPortal('/portal/training', 'user-aarav', repositoryFor(store));
    expect(await screen.findByText(/Circuits · Recorded/)).toBeTruthy();
    expect(screen.getByText(/Stall recovery · Outstanding/)).toBeTruthy();
    expect(screen.getByText('Satisfactory · Nisha Varghese · 28 Sep 2026')).toBeTruthy();
    expect(screen.queryByText('Internal note')).toBeNull();
    expect(screen.queryByRole('button', { name: /Record/ })).toBeNull();
  });

  it('shows only this cadet’s documents, fees, and notifications', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    store.addPayment({
      cadetId: 'cadet-aarav',
      amount: 10000,
      date: '2026-09-29',
      method: 'Cash',
      reference: 'UTR-PORTAL',
    }, { id: 'user-fin', name: 'Priya Shah', email: 'priya.shah@northstar.example', role: 'finance' });
    const documents = renderPortal('/portal/documents', 'user-aarav', repositoryFor(store));
    expect(await screen.findByText('Cadet enrolment form')).toBeTruthy();
    expect(screen.queryByText('Medical certificate (demo)')).toBeNull();
    expect(screen.queryByRole('button', { name: /Accept/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /download/i })).toBeNull();
    documents.unmount();

    const fees = renderPortal('/portal/fees', 'user-aarav', repositoryFor(store));
    const account = store.feeAccount('cadet-aarav');
    expect((await screen.findAllByText(/UTR-PORTAL/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(inr(account?.outstanding ?? 0)).length).toBeGreaterThan(0);
    expect(screen.getByText(/not a confirmed settlement/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Pay/ })).toBeNull();
    fees.unmount();

    const notes = renderPortal('/portal/notifications', 'user-aarav', repositoryFor(store));
    expect(await screen.findByText('Flight approved')).toBeTruthy();
    expect(screen.queryByText('Fee due date passed')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
    await waitFor(() => expect(store.listNotifications({ id: 'user-aarav', name: 'Aarav Menon', email: 'aarav.menon@northstar.example', role: 'cadet' })[0]?.read).toBe(true));
    notes.unmount();
  });

  it('blocks another role and an unlinked portal', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const denied = renderPortal('/portal', 'user-admin', repositoryFor(store));
    expect(await screen.findByText('Access limited')).toBeTruthy();
    denied.unmount();

    const base = repositoryFor(store);
    const unlinked = renderPortal('/portal', 'user-aarav', { ...base, portalHome: async () => null });
    expect(await screen.findByText('No cadet profile is linked.')).toBeTruthy();
    unlinked.unmount();

    renderPortal('/portal', 'user-aarav', { ...base, portalHome: async () => { throw new Error('offline'); } });
    expect(await screen.findByText('Your portal records did not load')).toBeTruthy();
  });
});
