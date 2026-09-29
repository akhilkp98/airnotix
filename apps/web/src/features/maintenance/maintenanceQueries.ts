import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';

export const maintenanceQueryKeys = {
  all: ['maintenance'] as const,
  page: ['maintenance', 'page'] as const,
};

export async function refreshAfterMaintenanceChange(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: maintenanceQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['fleet'] });
  await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useMaintenanceQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: maintenanceQueryKeys.page,
    queryFn: async () => {
      const [aircraft, defects, workOrders, documents, staff, flights] = await Promise.all([
        repository.listAircraft(),
        repository.listDefects(),
        repository.listWorkOrders(),
        repository.listDocuments(),
        repository.listStaff(),
        repository.listFlights(),
      ]);
      return { aircraft, defects, workOrders, documents, staff, flights };
    },
  });
}
