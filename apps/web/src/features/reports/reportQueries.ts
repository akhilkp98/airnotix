import { useQuery } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { useAuth } from '../auth/AuthProvider';
import { buildReport, type ReportFilters, type ReportKind } from './reportRules';

export function useReportQuery(kind: ReportKind, filters: ReportFilters, enabled = true) {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['reports', user?.id ?? '', kind, filters],
    enabled: enabled && Boolean(user),
    queryFn: async () => buildReport(await repository.reportRecords(), kind, filters),
  });
}
