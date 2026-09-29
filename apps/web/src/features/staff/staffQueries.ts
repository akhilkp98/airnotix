import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';

export const staffQueryKeys = {
  all: ['staff'] as const,
  list: ['staff', 'list'] as const,
  detail: (staffId: string) => ['staff', 'detail', staffId] as const,
};

export async function refreshAfterAvailabilityChange(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['flights'] });
  await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useStaffListQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: staffQueryKeys.list,
    queryFn: () => repository.listStaff(),
  });
}

export function useStaffDetailQuery(staffId: string) {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: staffQueryKeys.detail(staffId),
    enabled: Boolean(staffId),
    queryFn: async () => {
      const person = await repository.getStaff(staffId);
      if (!person) return { person: null };
      const [availability, documents] = await Promise.all([
        repository.listAvailability(),
        repository.listDocuments(),
      ]);
      return { person, availability, documents };
    },
  });
}
