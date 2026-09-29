import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';

export const documentQueryKeys = {
  all: ['documents'] as const,
  page: ['documents', 'page'] as const,
};

export async function refreshAfterDocumentReview(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: documentQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['cadet'] });
  await queryClient.invalidateQueries({ queryKey: ['fleet'] });
  await queryClient.invalidateQueries({ queryKey: ['staff'] });
  await queryClient.invalidateQueries({ queryKey: ['maintenance'] });
  await queryClient.invalidateQueries({ queryKey: ['approvals'] });
}

export function useDocumentsQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: documentQueryKeys.page,
    queryFn: async () => {
      const [documents, cadets, staff, aircraft, courses] = await Promise.all([
        repository.listDocuments(),
        repository.listCadetLabels(),
        repository.listStaff(),
        repository.listAircraft(),
        repository.listCourses(),
      ]);
      return { documents, cadets, staff, aircraft, courses };
    },
  });
}
