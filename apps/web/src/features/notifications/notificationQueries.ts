import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { useAuth } from '../auth/AuthProvider';

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => ['notifications', userId] as const,
};

export async function refreshNotifications(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['portal'] });
}

export function useNotificationQuery() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: notificationQueryKeys.list(user?.id ?? ''),
    enabled: Boolean(user),
    queryFn: async () => {
      const actor = user;
      if (!actor) return [];
      return repository.listNotifications(actor);
    },
  });
}
