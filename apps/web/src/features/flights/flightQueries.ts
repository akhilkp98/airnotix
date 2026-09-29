import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { FlightInput } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { useAuth } from '../auth/AuthProvider';

export const flightQueryKeys = {
  all: ['flights'] as const,
  schedule: ['flights', 'schedule'] as const,
  form: (userId: string) => ['flights', 'form', userId] as const,
  detail: (flightId: string) => ['flights', 'detail', flightId] as const,
  issues: (input: FlightInput) => ['flights', 'issues', input] as const,
};

export async function refreshAfterFlightChange(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: flightQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['cadets'] });
  await queryClient.invalidateQueries({ queryKey: ['cadet'] });
  await queryClient.invalidateQueries({ queryKey: ['training'] });
  await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  await queryClient.invalidateQueries({ queryKey: ['notifications'] });
  await queryClient.invalidateQueries({ queryKey: ['approvals'] });
}

export function useFlightScheduleQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: flightQueryKeys.schedule,
    queryFn: async () => {
      const [flights, labels, staff, aircraft, academy] = await Promise.all([
        repository.listFlights(),
        repository.listCadetLabels(),
        repository.listStaff(),
        repository.listAircraft(),
        repository.getAcademy(),
      ]);
      return { flights, labels, staff, aircraft, academy };
    },
  });
}

export function useFlightFormQuery() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: flightQueryKeys.form(user?.id ?? ''),
    enabled: Boolean(user),
    queryFn: async () => {
      const actor = user;
      if (!actor) throw new Error('Sign in before scheduling a flight.');
      const [cadets, staff, aircraft, syllabi] = await Promise.all([
        repository.listCadets(actor),
        repository.listStaff(),
        repository.listAircraft(),
        repository.listSyllabi(),
      ]);
      const items = syllabi
        .filter((syllabus) => syllabus.status !== 'Archived')
        .flatMap((syllabus) => syllabus.phases.flatMap((phase) => phase.items));
      return { cadets, staff, aircraft, items };
    },
  });
}

export function useFlightDetailQuery(flightId: string) {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: flightQueryKeys.detail(flightId),
    enabled: Boolean(flightId),
    queryFn: async () => {
      const flight = await repository.getFlight(flightId);
      if (!flight) return { flight: null };
      const [labels, staff, aircraft, syllabi, issues, audit] = await Promise.all([
        repository.listCadetLabels(),
        repository.listStaff(),
        repository.listAircraft(),
        repository.listSyllabi(),
        repository.schedulingIssues(flight, flight.id),
        repository.listAudit(),
      ]);
      return {
        flight,
        labels,
        staff,
        aircraft,
        syllabi,
        issues,
        audit: audit.filter((event) => event.resourceId === flight.id),
      };
    },
  });
}

export function useFlightIssuesQuery(input: FlightInput, enabled: boolean) {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: flightQueryKeys.issues(input),
    enabled,
    queryFn: () => repository.schedulingIssues(input, input.id),
  });
}
