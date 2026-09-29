import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { useAuth } from '../auth/AuthProvider';

export const financeQueryKeys = {
  all: ['finance'] as const,
  page: (userId: string) => ['finance', 'page', userId] as const,
};

export async function refreshAfterFinanceChange(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: financeQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['cadets'] });
  await queryClient.invalidateQueries({ queryKey: ['cadet'] });
  await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useFinanceQuery() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.page(user?.id ?? ''),
    enabled: Boolean(user),
    queryFn: async () => {
      const actor = user;
      if (!actor) throw new Error('Sign in before opening finance.');
      const [snapshot, accounts, expenses] = await Promise.all([
        repository.financeSnapshot(),
        repository.listFeeAccounts(actor),
        repository.listExpenses(),
      ]);
      return { snapshot, accounts, expenses };
    },
  });
}
