import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';

export const cadetQueryKeys = {
  list: (userId: string) => ['cadets', userId] as const,
  detail: (userId: string, cadetId: string) => ['cadet', userId, cadetId] as const,
  form: ['cadet-form'] as const,
};

export function useCadetListQuery() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: cadetQueryKeys.list(user?.id ?? ''),
    enabled: Boolean(user),
    queryFn: async () => {
      const actor = user;
      if (!actor) throw new Error('Sign in before loading cadets.');
      const [cadets, courses, flights] = await Promise.all([
        repository.listCadets(actor),
        repository.listCourses(),
        repository.listFlights(),
      ]);
      return { cadets, courses, flights };
    },
  });
}

export function useCadetFormOptionsQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: cadetQueryKeys.form,
    queryFn: async () => {
      const [courses, staff, academy] = await Promise.all([
        repository.listCourses(),
        repository.listStaff(),
        repository.getAcademy(),
      ]);
      return { courses, staff, branchName: academy.branchName };
    },
  });
}

export function useCadetProfileQuery(cadetId: string) {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: cadetQueryKeys.detail(user?.id ?? '', cadetId),
    enabled: Boolean(user) && Boolean(cadetId),
    queryFn: async () => {
      const actor = user;
      if (!actor) throw new Error('Sign in before opening a cadet.');
      const lookup = await repository.lookupCadet(cadetId, actor);
      if (lookup.status !== 'found') {
        return {
          lookup,
          courses: [],
          staff: [],
          syllabi: [],
          flights: [],
          aircraft: [],
          documents: [],
          payments: [],
          audit: [],
          assessments: [],
          fees: null,
        };
      }
      const [courses, staff, syllabi, flights, aircraft, documents, payments, audit, assessments] = await Promise.all([
        repository.listCourses(),
        repository.listStaff(),
        repository.listSyllabi(),
        repository.listFlights(),
        repository.listAircraft(),
        repository.listDocuments(),
        repository.listPayments(),
        repository.listAudit(),
        repository.listAssessments(),
      ]);
      const fees = await repository.feeAccount(cadetId);
      return {
        lookup,
        courses,
        staff,
        syllabi,
        flights: flights.filter((flight) => flight.cadetId === cadetId),
        aircraft,
        documents: documents.filter((document) => document.ownerId === cadetId),
        payments: payments.filter((payment) => payment.cadetId === cadetId),
        audit: audit.filter((event) => event.resourceId === cadetId),
        assessments: assessments.filter((assessment) => assessment.cadetId === cadetId),
        fees,
      };
    },
  });
}
