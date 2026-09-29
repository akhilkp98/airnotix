import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';

export const trainingQueryKeys = {
  all: ['training'] as const,
  courses: (userId: string) => ['training', 'courses', userId] as const,
  syllabus: ['training', 'syllabus'] as const,
  progress: (userId: string) => ['training', 'progress', userId] as const,
};

export function useTrainingCoursesQuery() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: trainingQueryKeys.courses(user?.id ?? ''),
    enabled: Boolean(user),
    queryFn: async () => {
      const actor = user;
      if (!actor) throw new Error('Sign in before loading courses.');
      const [courses, syllabi, cadets] = await Promise.all([
        repository.listCourses(),
        repository.listSyllabi(),
        repository.listCadets(actor),
      ]);
      return { courses, syllabi, cadets };
    },
  });
}

export function useSyllabusQuery() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: trainingQueryKeys.syllabus,
    queryFn: async () => {
      const [courses, syllabi] = await Promise.all([
        repository.listCourses(),
        repository.listSyllabi(),
      ]);
      return { courses, syllabi };
    },
  });
}

export function useTrainingProgressQuery() {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  return useQuery({
    queryKey: trainingQueryKeys.progress(user?.id ?? ''),
    enabled: Boolean(user),
    queryFn: async () => {
      const actor = user;
      if (!actor) throw new Error('Sign in before loading progress.');
      const [cadets, courses, syllabi, assessments] = await Promise.all([
        repository.listCadets(actor),
        repository.listCourses(),
        repository.listSyllabi(),
        repository.listAssessments(),
      ]);
      return { cadets, courses, syllabi, assessments };
    },
  });
}
