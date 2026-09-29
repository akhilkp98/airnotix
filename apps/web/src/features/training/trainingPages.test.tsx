// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { ConfirmProvider } from '../../components/feedback/confirm';
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
import { chooseOption } from '../../test/chooseOption';
import { CoursesPage } from './CoursesPage';
import { ProgressPage } from './ProgressPage';
import { SyllabusPage } from './SyllabusPage';

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

function renderTraining(path: string, userId: string, repository: WorkspaceRepository) {
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
        { path: 'training/courses', element: <RequirePermission permission="training.view"><CoursesPage /></RequirePermission> },
        { path: 'training/syllabus', element: <RequirePermission permission="training.view"><SyllabusPage /></RequirePermission> },
        { path: 'training/progress', element: <RequirePermission permission="training.view"><ProgressPage /></RequirePermission> },
        { path: 'cadets/:cadetId', element: <RequirePermission permission="cadets.view"><CadetProfilePage /></RequirePermission> },
      ],
    },
  ], { initialEntries: [path] });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <WorkspaceRepositoryProvider repository={repository}>
          <AuthProvider>
            <ConfirmProvider>
              <AppSnackbarProvider>
                <RouterProvider router={router} />
              </AppSnackbarProvider>
            </ConfirmProvider>
          </AuthProvider>
        </WorkspaceRepositoryProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function repositoryFor(store: WorkspaceStore, patch?: Partial<WorkspaceRepository>) {
  return { ...createMockWorkspaceRepository({ store, wait: async () => {} }), ...patch };
}

describe('training screens', () => {
  it('renders fixture courses and the linked syllabus', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderTraining('/training/courses', 'user-admin', repositoryFor(store));
    expect(await screen.findByText('CPL-ILL')).toBeTruthy();
    expect(screen.getByText('PPL-ILL')).toBeTruthy();
    expect(screen.getAllByText('CPL illustrative v1').length).toBeGreaterThan(0);
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getAllByText(/Illustrative required count 100/).length).toBeGreaterThan(0);
    expect(screen.getByText('Ground Knowledge (3 named items)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add course' })).toBeNull();
  });

  it('shows course loading, empty, and error states', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const base = repositoryFor(store);
    const loading = renderTraining('/training/courses', 'user-admin', {
      ...base,
      listCourses: async () => {
        await gate;
        return base.listCourses();
      },
    });
    expect(await screen.findByRole('progressbar', { name: 'Loading courses' })).toBeTruthy();
    release();
    expect(await screen.findByText('CPL-ILL')).toBeTruthy();
    loading.unmount();

    const empty = renderTraining('/training/courses', 'user-admin', {
      ...base,
      listCourses: async () => [],
    });
    expect(await screen.findByText('No courses are in this workspace')).toBeTruthy();
    empty.unmount();

    renderTraining('/training/courses', 'user-admin', {
      ...base,
      listCourses: async () => {
        throw new Error('offline');
      },
    });
    expect(await screen.findByText('The course register did not load')).toBeTruthy();
  });

  it('shows syllabus structure and refuses edits without training.configure', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const view = renderTraining('/training/syllabus', 'user-ops', repositoryFor(store));
    expect(await screen.findByRole('heading', { name: 'CPL illustrative v1' })).toBeTruthy();
    expect(screen.getAllByText('Air law briefing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Principles of flight').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'CPL draft' })).toBeTruthy();
    expect(screen.getAllByText('Meteorology classroom').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Publish version' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add phase' })).toBeNull();
    view.unmount();

    renderTraining('/training/syllabus', 'user-admin', {
      ...repositoryFor(store),
      listSyllabi: async () => [],
    });
    expect(await screen.findByText('No syllabi are in this workspace')).toBeTruthy();
  });

  it('edits a draft, blocks an empty publish, and leaves cadet assignments unchanged', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderTraining('/training/syllabus', 'user-cfi', repositoryFor(store));
    expect(await screen.findByRole('button', { name: 'Publish version' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Publish version' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('Add at least one phase before publishing.')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(store.listSyllabi().find((item) => item.id === 'syl-cpl-draft')?.status).toBe('Draft');

    fireEvent.change(screen.getByLabelText('Phase name'), { target: { value: 'Demo phase' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add phase' }));
    expect(await screen.findByRole('heading', { name: 'Demo phase' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(await screen.findByText('Item name is required.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Demo item' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(await screen.findByText('Demo item')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Move Demo item up' }));
    expect(await screen.findByText('That item cannot move further.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Publish version' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('Syllabus published.')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    await waitFor(() => {
      expect(store.listSyllabi().find((item) => item.id === 'syl-cpl-1')?.status).toBe('Archived');
    });
    expect(store.listCourses().find((item) => item.id === 'course-cpl')?.syllabusId).toBe('syl-cpl-draft');
    expect(store.listCadets(null).find((item) => item.id === 'cadet-aarav')?.syllabusId).toBe('syl-cpl-1');
    expect(screen.getByText('Archived')).toBeTruthy();
  });

  it('shows known illustrative progress and filters the visible register', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    renderTraining('/training/progress', 'user-admin', repositoryFor(store));
    expect(await screen.findByText('36%')).toBeTruthy();
    expect(screen.getByText('52%')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('No assessments recorded yet.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search cadets'), { target: { value: 'Neil' } });
    await waitFor(() => {
      expect(screen.getByText('100%')).toBeTruthy();
      expect(screen.queryByText('36%')).toBeNull();
    });
  });

  it('validates an assessment, persists the first satisfactory record, and opens the cadet profile', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    renderTraining('/training/progress', 'user-cfi', repository);
    expect(await screen.findByRole('button', { name: 'Save assessment' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save assessment' }));
    expect(await screen.findByText('Cadet, training item, and outcome are required.')).toBeTruthy();
    expect(screen.getByText('Cadet is required.')).toBeTruthy();
    expect(store.listAssessments()).toHaveLength(0);

    await chooseOption(/^Cadet/, 'Aarav Menon');
    await chooseOption(/^Training item/, 'Stall recovery');
    fireEvent.click(screen.getByRole('button', { name: 'Save assessment' }));
    expect(await screen.findByText('Assessment recorded.')).toBeTruthy();
    expect(store.getCadet('cadet-aarav', null)?.completedRequired).toBe(37);
    expect(store.getCadet('cadet-aarav', null)?.completedItemIds).toEqual(['item-stall']);
    expect(screen.getByText('29 Sep 2026')).toBeTruthy();

    await chooseOption(/^Cadet/, 'Aarav Menon');
    await chooseOption(/^Training item/, 'Stall recovery');
    fireEvent.click(screen.getByRole('button', { name: 'Save assessment' }));
    await waitFor(() => {
      expect(store.listAssessments()).toHaveLength(2);
    });
    expect(store.getCadet('cadet-aarav', null)?.completedRequired).toBe(37);

    fireEvent.click(screen.getByRole('link', { name: 'Aarav Menon' }));
    expect(await screen.findByRole('heading', { name: 'Aarav Menon' })).toBeTruthy();
    expect(await screen.findByText(/Illustrative progress 37%/)).toBeTruthy();
    expect(screen.getAllByText('Stall recovery').length).toBeGreaterThan(0);
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText(/Named items recorded as completed: 1/)).toBeTruthy();
    expect(screen.getAllByText('Nisha Varghese').length).toBeGreaterThan(0);
  });

  it('does not increase the counter for further training and hides the form without training.assess', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const progress = renderTraining('/training/progress', 'user-arun', repository);
    expect(await screen.findByRole('button', { name: 'Save assessment' })).toBeTruthy();
    expect(screen.getByText('36%')).toBeTruthy();
    expect(screen.getByText('41%')).toBeTruthy();
    expect(screen.queryByText('52%')).toBeNull();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^Cadet/ }));
    expect(within(await screen.findByRole('listbox')).queryByRole('option', { name: 'Diya Nair' })).toBeNull();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    await chooseOption(/^Cadet/, 'Aarav Menon');
    await chooseOption(/^Training item/, 'Stall recovery');
    await chooseOption('Outcome', 'Further Training Required');
    fireEvent.click(screen.getByRole('button', { name: 'Save assessment' }));
    expect(await screen.findByText('Assessment recorded.')).toBeTruthy();
    expect(store.getCadet('cadet-aarav', null)?.completedRequired).toBe(36);
    expect(store.getCadet('cadet-aarav', null)?.completedItemIds).toEqual([]);
    progress.unmount();

    renderTraining('/cadets/cadet-aarav?tab=training', 'user-arun', repository);
    expect(await screen.findByText(/Illustrative progress 36%/)).toBeTruthy();
    expect(screen.getByText('Further Training Required')).toBeTruthy();
    expect(screen.queryByText('Completed')).toBeNull();
  });

  it('blocks training routes for roles without training.view', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const repository = repositoryFor(store);
    const superAdmin = renderTraining('/training/courses', 'user-super', repository);
    expect(await screen.findByText('Access limited')).toBeTruthy();
    superAdmin.unmount();

    const cadet = renderTraining('/training/progress', 'user-aarav', repository);
    expect(await screen.findByText('Access limited')).toBeTruthy();
    cadet.unmount();

    const finance = renderTraining('/training/syllabus', 'user-fin', repository);
    expect(await screen.findByText('Access limited')).toBeTruthy();
    finance.unmount();

    renderTraining('/training/progress', 'user-ops', repository);
    expect(await screen.findByText('Your role can review assessments already recorded.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save assessment' })).toBeNull();
    expect(await screen.findByText('36%')).toBeTruthy();
  });

  it('shows a syllabus error and a progress error', async () => {
    const store = createWorkspaceStore(createMemoryStorage());
    const syllabus = renderTraining('/training/syllabus', 'user-admin', {
      ...repositoryFor(store),
      listSyllabi: async () => {
        throw new Error('offline');
      },
    });
    expect(await screen.findByText('The syllabus register did not load')).toBeTruthy();
    syllabus.unmount();

    renderTraining('/training/progress', 'user-admin', {
      ...repositoryFor(store),
      listCadets: async () => {
        throw new Error('offline');
      },
    });
    expect(await screen.findByText('Cadet progress did not load')).toBeTruthy();
  });
});
