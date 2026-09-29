import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';

export const fuelQueryKeys = {
  all: ['fuel'] as const,
  page: ['fuel', 'page'] as const,
};

export async function refreshAfterFuelChange(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: fuelQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useFuelQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: fuelQueryKeys.page,
    queryFn: async () => {
      const tanks = await repository.listTanks();
      const [transactions, balances] = await Promise.all([
        repository.listFuelTransactions(),
        Promise.all(tanks.map(async (tank) => [tank.id, await repository.fuelBalance(tank.id)] as const)),
      ]);
      return { tanks, transactions, balances: Object.fromEntries(balances) as Record<string, number> };
    },
  });
}
