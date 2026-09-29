import { useQuery } from '@tanstack/react-query';
import { itemName } from '../../domain/calculations';
import type { DemoUser } from '../../domain/demoData';
import type { Syllabus, WorkspaceState } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import type { WorkspaceRepository } from '../../services/repositories/workspaceRepository';
import { useAuth } from '../auth/AuthProvider';
import {
  aircraftNotAvailable,
  assessmentLines,
  assignedActiveCadets,
  availableAircraft,
  blocksOfKind,
  cadetProgressLines,
  countStatus,
  documentsForOwner,
  draftFlights,
  flightLines,
  flightsOnDemoDay,
  followUpFlights,
  instructorUpcomingFlights,
  lowFuelTanks,
  openDefectList,
  overdueFirst,
  pendingDocuments,
  qualificationAttention,
  recentByDate,
  upcomingApprovedFlights,
  upcomingAvailability,
  CADET_OUTSIDE_ASSIGNMENT,
  statusBreakdown,
  usersByRole,
  watchFlights,
  workOrdersForAssignee,
  cadetDisplayName,
  type FlightIssueLine,
} from './dashboardRules';
import { openWorkOrders } from '../maintenance/maintenanceRules';

function names(repositoryLoad: {
  cadets: { id: string; firstName?: string; lastName?: string; name?: string }[];
  staff: { id: string; name: string }[];
  aircraft: { id: string; code: string }[];
}, missingCadet = 'Unknown cadet') {
  const cadetName = (id: string) => cadetDisplayName(
    repositoryLoad.cadets.find((item) => item.id === id),
    missingCadet,
  );
  const instructorName = (id: string) => repositoryLoad.staff.find((item) => item.id === id)?.name ?? '';
  const aircraftCode = (id: string) => repositoryLoad.aircraft.find((item) => item.id === id)?.code ?? '';
  return { cadetName, instructorName, aircraftCode };
}

function syllabusItemName(syllabi: Syllabus[], itemId: string) {
  return itemName({ syllabi } as WorkspaceState, itemId);
}

async function planningIssues(repository: WorkspaceRepository, flights: Parameters<typeof watchFlights>[0], lineFor: ReturnType<typeof names>) {
  const issues: FlightIssueLine[] = [];
  for (const flight of watchFlights(flights)) {
    const found = await repository.schedulingIssues(flight, flight.id);
    const line = flightLines([flight], lineFor.cadetName, lineFor.instructorName, lineFor.aircraftCode)[0];
    found.forEach((issue) => issues.push({ ...line, level: issue.level, message: issue.message }));
  }
  return issues;
}

export function useSuperAdminDashboard() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'super-admin', user?.id ?? ''],
    enabled: user?.role === 'super-admin',
    queryFn: async () => {
      const [users, audit, academy, notifications] = await Promise.all([
        repository.listDemoUsers(),
        repository.listAudit(),
        repository.getAcademy(),
        repository.listNotifications(user),
      ]);
      return { users, roles: usersByRole(users), audit: audit.slice(0, 6), academy, notifications };
    },
  });
}

export function useAcademyDashboard() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'academy-admin', user?.id ?? ''],
    enabled: user?.role === 'academy-admin',
    queryFn: () => loadAcademy(repository, user),
  });
}

async function loadAcademy(repository: WorkspaceRepository, user: DemoUser | null) {
  const [cadets, flights, aircraft, pending, finance, defects, workOrders, documents, tanks, staff, notifications, academy] = await Promise.all([
    repository.listCadets(user),
    repository.listFlights(),
    repository.listAircraft(),
    repository.listPendingApprovals(),
    repository.financeSnapshot(),
    repository.listDefects(),
    repository.listWorkOrders(),
    repository.listDocuments(),
    repository.listTanks(),
    repository.listStaff(),
    repository.listNotifications(user),
    repository.getAcademy(),
  ]);
  const balances = Object.fromEntries(await Promise.all(tanks.map(async (tank) => [tank.id, await repository.fuelBalance(tank.id)] as const)));
  const lookup = names({ cadets, staff, aircraft });
  return {
    activeCadets: countStatus(cadets, 'Active'),
    onHoldCadets: countStatus(cadets, 'On Hold'),
    flightsToday: flightLines(flightsOnDemoDay(flights), lookup.cadetName, lookup.instructorName, lookup.aircraftCode),
    availableAircraft: availableAircraft(aircraft).length,
    unavailableAircraft: aircraftNotAvailable(aircraft),
    pending,
    cadetName: lookup.cadetName,
    finance,
    defects: openDefectList(defects),
    workOrders: openWorkOrders(workOrders),
    staffName: lookup.instructorName,
    aircraftCode: lookup.aircraftCode,
    pendingDocuments: pendingDocuments(documents),
    lowFuel: lowFuelTanks(tanks, balances).map((tank) => ({ ...tank, balance: balances[tank.id] ?? 0 })),
    notifications,
    cadetStatus: statusBreakdown(cadets),
    academy,
  };
}

export function useOperationsDashboard() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'operations', user?.id ?? ''],
    enabled: user?.role === 'operations',
    queryFn: async () => {
      const [cadets, flights, aircraft, pending, tanks, staff, availability, academy] = await Promise.all([
        repository.listCadets(user),
        repository.listFlights(),
        repository.listAircraft(),
        repository.listPendingApprovals(),
        repository.listTanks(),
        repository.listStaff(),
        repository.listAvailability(),
        repository.getAcademy(),
      ]);
      const balances = Object.fromEntries(await Promise.all(tanks.map(async (tank) => [tank.id, await repository.fuelBalance(tank.id)] as const)));
      const lookup = names({ cadets, staff, aircraft });
      return {
        activeCadets: countStatus(cadets, 'Active'),
        flightsToday: flightLines(flightsOnDemoDay(flights), lookup.cadetName, lookup.instructorName, lookup.aircraftCode),
        availableAircraft: availableAircraft(aircraft).length,
        pending,
        cadetName: lookup.cadetName,
        drafts: flightLines(draftFlights(flights), lookup.cadetName, lookup.instructorName, lookup.aircraftCode),
        issues: await planningIssues(repository, flights, lookup),
        unavailableAircraft: aircraftNotAvailable(aircraft),
        leave: blocksOfKind(upcomingAvailability(availability), 'Leave'),
        unavailableBlocks: blocksOfKind(upcomingAvailability(availability), 'Unavailable'),
        staffName: lookup.instructorName,
        lowFuel: lowFuelTanks(tanks, balances).map((tank) => ({ ...tank, balance: balances[tank.id] ?? 0 })),
        academy,
      };
    },
  });
}

export function useCfiDashboard() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'cfi', user?.id ?? ''],
    enabled: user?.role === 'cfi',
    queryFn: async () => {
      const [cadets, courses, flights, pending, documents, assessments, syllabi, staff, aircraft, notifications] = await Promise.all([
        repository.listCadets(user),
        repository.listCourses(),
        repository.listFlights(),
        repository.listPendingApprovals(),
        repository.listDocuments(),
        repository.listAssessments(),
        repository.listSyllabi(),
        repository.listStaff(),
        repository.listAircraft(),
        repository.listNotifications(user),
      ]);
      const lookup = names({ cadets, staff, aircraft });
      return {
        activeCadets: countStatus(cadets, 'Active'),
        flightsToday: flightsOnDemoDay(flights).length,
        pending,
        cadetName: lookup.cadetName,
        progress: cadetProgressLines(cadets, courses, flights),
        pendingDocuments: pendingDocuments(documents),
        upcoming: flightLines(upcomingApprovedFlights(flights), lookup.cadetName, lookup.instructorName, lookup.aircraftCode),
        assessments: assessmentLines(assessments, lookup.cadetName, (id) => syllabusItemName(syllabi, id)),
        notifications,
      };
    },
  });
}

export function useInstructorDashboard() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  const staffId = user?.staffId ?? '';
  return useQuery({
    queryKey: ['dashboard', 'instructor', user?.id ?? '', staffId],
    enabled: user?.role === 'instructor',
    queryFn: async () => {
      const actor = user;
      const [cadets, courses, flights, staff, aircraft, notifications, academy] = await Promise.all([
        repository.listCadets(actor),
        repository.listCourses(),
        repository.listFlights(),
        repository.listStaff(),
        repository.listAircraft(),
        repository.listNotifications(actor),
        repository.getAcademy(),
      ]);
      const lookup = names({ cadets, staff, aircraft }, CADET_OUTSIDE_ASSIGNMENT);
      const active = assignedActiveCadets(cadets);
      const mine = staff.find((member) => member.id === staffId);
      return {
        linked: Boolean(staffId),
        active: cadetProgressLines(active, courses, flights),
        upcoming: flightLines(instructorUpcomingFlights(flights, staffId), lookup.cadetName, lookup.instructorName, lookup.aircraftCode),
        followUps: flightLines(followUpFlights(flights, staffId), lookup.cadetName, lookup.instructorName, lookup.aircraftCode),
        qualification: mine?.qualifications[0] ?? null,
        staffName: mine?.name ?? '',
        notifications,
        academy,
      };
    },
  });
}

export function useMaintenanceDashboard() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'maintenance', user?.id ?? '', user?.staffId ?? ''],
    enabled: user?.role === 'maintenance',
    queryFn: async () => {
      const [aircraft, defects, workOrders, documents, staff, notifications] = await Promise.all([
        repository.listAircraft(),
        repository.listDefects(),
        repository.listWorkOrders(),
        repository.listDocuments(),
        repository.listStaff(),
        repository.listNotifications(user),
      ]);
      const lookup = names({ cadets: [], staff, aircraft });
      const openOrders = openWorkOrders(workOrders);
      return {
        available: availableAircraft(aircraft).length,
        unavailable: aircraftNotAvailable(aircraft),
        defects: openDefectList(defects),
        workOrders: openOrders,
        assignedOrders: workOrdersForAssignee(workOrders, user?.staffId ?? ''),
        aircraftCode: lookup.aircraftCode,
        staffName: lookup.instructorName,
        aircraftDocuments: documentsForOwner(documents, 'Aircraft'),
        notifications,
      };
    },
  });
}

export function useFinanceDashboard() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'finance', user?.id ?? ''],
    enabled: user?.role === 'finance',
    queryFn: async () => {
      const [snapshot, accounts, payments, expenses, notifications] = await Promise.all([
        repository.financeSnapshot(),
        repository.listFeeAccounts(user),
        repository.listPayments(),
        repository.listExpenses(),
        repository.listNotifications(user),
      ]);
      return {
        snapshot,
        accounts: overdueFirst(accounts),
        payments: recentByDate(payments),
        expenses: recentByDate(expenses),
        notifications,
      };
    },
  });
}

export function useHrDashboard() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'hr', user?.id ?? ''],
    enabled: user?.role === 'hr',
    queryFn: async () => {
      const [staff, availability, documents, notifications] = await Promise.all([
        repository.listStaff(),
        repository.listAvailability(),
        repository.listDocuments(),
        repository.listNotifications(user),
      ]);
      const staffName = (id: string) => staff.find((member) => member.id === id)?.name ?? '';
      const upcoming = upcomingAvailability(availability);
      return {
        staff,
        attention: qualificationAttention(staff),
        leave: blocksOfKind(upcoming, 'Leave'),
        unavailableBlocks: blocksOfKind(upcoming, 'Unavailable'),
        staffDocuments: pendingDocuments(documentsForOwner(documents, 'Staff')),
        staffName,
        notifications,
      };
    },
  });
}
