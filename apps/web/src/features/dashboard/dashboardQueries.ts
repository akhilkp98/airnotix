import { useQuery } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { useAuth } from '../auth/AuthProvider';

export function useDashboardQuery() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', user?.id ?? ''],
    enabled: Boolean(user),
    queryFn: async () => {
      const actor = user;
      if (!actor) throw new Error('Sign in before loading the dashboard.');
      return repository.dashboardSummary(actor);
    },
  });
}
