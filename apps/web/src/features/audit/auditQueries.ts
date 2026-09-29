import { useQuery } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';

export function useAuditQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: ['audit'],
    queryFn: () => repository.listAudit(),
  });
}
