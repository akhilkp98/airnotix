import { useQuery } from '@tanstack/react-query';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { buildReport, type ReportFilters, type ReportKind } from './reportRules';

export function useReportQuery(kind: ReportKind, filters: ReportFilters) {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: ['reports', kind, filters],
    queryFn: async () => buildReport(await repository.reportRecords(), kind, filters),
  });
}
