import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';

export const fleetQueryKeys = {
  all: ['fleet'] as const,
  list: ['fleet', 'list'] as const,
  detail: (aircraftId: string) => ['fleet', 'detail', aircraftId] as const,
};

export async function refreshAfterAircraftChange(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: fleetQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['flights'] });
  await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  await queryClient.invalidateQueries({ queryKey: ['maintenance'] });
}

export function useFleetListQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: fleetQueryKeys.list,
    queryFn: async () => {
      const [aircraft, flights] = await Promise.all([
        repository.listAircraft(),
        repository.listFlights(),
      ]);
      return { aircraft, flights };
    },
  });
}

export function useAircraftDetailQuery(aircraftId: string) {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: fleetQueryKeys.detail(aircraftId),
    enabled: Boolean(aircraftId),
    queryFn: async () => {
      const aircraft = await repository.getAircraft(aircraftId);
      if (!aircraft) return { aircraft: null };
      const [flights, defects, workOrders, documents] = await Promise.all([
        repository.listFlights(),
        repository.listDefects(),
        repository.listWorkOrders(),
        repository.listDocuments(),
      ]);
      return { aircraft, flights, defects, workOrders, documents };
    },
  });
}
