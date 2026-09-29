import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { EmptyState } from '../../components/data/EmptyState';
import { PageHeader } from '../../components/data/PageHeader';
import { RecordGrid } from '../../components/data/RecordGrid';
import { StatusChip } from '../../components/data/StatusChip';
import { tokens } from '../../theme/tokens';
import { useTrainingCoursesQuery } from './trainingQueries';

type CourseRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  syllabus: string;
  enrolled: number;
  status: string;
};

export function CoursesPage() {
  const query = useTrainingCoursesQuery();

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Courses" subtitle="Example programmes only. Not a regulator-approved syllabus." />
        <CircularProgress aria-label="Loading courses" sx={{ color: 'primary.main' }} />
      </>
    );
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Courses" subtitle="The course register could not be read." />
        <EmptyState
          title="The course register did not load"
          body="The demonstration records could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      </>
    );
  }

  const { courses, syllabi, cadets } = query.data;
  const rows: CourseRow[] = courses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    type: course.type,
    syllabus: syllabi.find((item) => item.id === course.syllabusId)?.label ?? '',
    enrolled: cadets.filter((cadet) => cadet.courseId === course.id).length,
    status: course.status,
  }));
  const columns: GridColDef<CourseRow>[] = [
    { field: 'code', headerName: 'Code', flex: 0.7, minWidth: 110 },
    { field: 'name', headerName: 'Course', flex: 1.2, minWidth: 160 },
    { field: 'type', headerName: 'Type', flex: 0.6, minWidth: 90 },
    { field: 'syllabus', headerName: 'Syllabus', flex: 1.2, minWidth: 180 },
    { field: 'enrolled', headerName: 'Enrolled', flex: 0.5, minWidth: 100 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.6,
      minWidth: 110,
      renderCell: (params) => <StatusChip status={params.row.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Courses"
        subtitle="Example programmes only. Not a regulator-approved syllabus."
      />
      <RecordGrid
        rows={rows}
        columns={columns}
        emptyTitle="No courses are in this workspace"
        emptyBody="Course records are read from the academy workspace."
      />
      {rows.length > 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Showing {rows.length} programmes. The prototype course table has no search, and this workspace has no course create or edit action.
        </Typography>
      ) : null}
      <Box sx={{ display: 'grid', gap: 2, mt: 3 }}>
        {courses.map((course) => {
          const syllabus = syllabi.find((item) => item.id === course.syllabusId);
          return (
            <Box key={course.id} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
              <Typography sx={{ fontWeight: 600, color: tokens.navy }}>{course.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {`${course.code} · ${course.type} · Illustrative required count ${course.requiredCount}. That count is not the number of named syllabus items.`}
              </Typography>
              {syllabus ? (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {`Current syllabus: ${syllabus.label}`}
                  </Typography>
                  <StatusChip status={syllabus.status} />
                  {syllabus.phases.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This version has no phases yet.</Typography>
                  ) : syllabus.phases.map((phase) => (
                    <Typography key={phase.id} variant="body2" sx={{ mt: 0.75 }}>
                      {`${phase.name} (${phase.items.length} named items)`}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No syllabus is linked.</Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </>
  );
}
