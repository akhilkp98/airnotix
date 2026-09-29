import { useQuery } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';

export const approvalQueryKeys = {
  all: ['approvals'] as const,
  page: ['approvals', 'page'] as const,
};

export function useApprovalsQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: approvalQueryKeys.page,
    queryFn: async () => {
      const [pending, decided, labels, documents] = await Promise.all([
        repository.listPendingApprovals(),
        repository.listRecordedDecisions(),
        repository.listCadetLabels(),
        repository.listDocuments(),
      ]);
      return {
        pending,
        decided,
        labels,
        pendingDocuments: documents.filter((item) => item.review === 'Pending'),
      };
    },
  });
}
