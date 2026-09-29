import { useQuery } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { useAuth } from '../auth/AuthProvider';

export function usePortalQuery() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['portal', user?.id ?? ''],
    enabled: Boolean(user),
    queryFn: () => repository.portalHome(user),
  });
}
