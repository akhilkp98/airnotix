import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { WorkspaceRepository } from './workspaceRepository';
import { queryKeys } from '../queryClient';

const WorkspaceRepositoryContext = createContext<WorkspaceRepository | null>(null);

export function WorkspaceRepositoryProvider({
  repository,
  children,
}: {
  repository: WorkspaceRepository;
  children: ReactNode;
}) {
  return (
    <WorkspaceRepositoryContext.Provider value={repository}>{children}</WorkspaceRepositoryContext.Provider>
  );
}

export function useWorkspaceRepository() {
  const repository = useContext(WorkspaceRepositoryContext);
  if (!repository) {
    throw new Error('Workspace repository is not available.');
  }
  return repository;
}

export function useAcademyQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: queryKeys.academy,
    queryFn: () => repository.getAcademy(),
  });
}

export function useDemoUsersQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: queryKeys.demoUsers,
    queryFn: () => repository.listDemoUsers(),
  });
}
