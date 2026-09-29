import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { RecordGrid } from '../../components/data/RecordGrid';
import { StatusChip } from '../../components/data/StatusChip';
import { progressPercent, recordedCadetHours } from '../../domain/calculations';
import type { WorkspaceState } from '../../domain/workspace';
import { useAuth } from '../auth/AuthProvider';
import { CADET_STATUS_OPTIONS, filterCadets } from './cadetRules';
import { useCadetListQuery } from './cadetQueries';

type CadetRow = {
  id: string;
  code: string;
  name: string;
  course: string;
  batch: string;
  progress: string;
  hours: number;
  status: string;
};

export function CadetListPage() {
  const { can } = useAuth();
  const query = useCadetListQuery();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const courseId = params.get('course') ?? '';
  const status = params.get('status') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const loaded = query.data;
  const visible = loaded
    ? filterCadets(loaded.cadets, { search, courseId, status })
    : [];
  const rows: CadetRow[] = loaded
    ? visible.map((cadet) => {
      const state = { courses: loaded.courses, cadets: loaded.cadets, flights: loaded.flights } as WorkspaceState;
      const course = loaded.courses.find((item) => item.id === cadet.courseId);
      return {
        id: cadet.id,
        code: cadet.code,
        name: `${cadet.firstName} ${cadet.lastName}`,
        course: course?.name ?? '',
        batch: cadet.batch,
        progress: `${progressPercent(state, cadet)}%`,
        hours: recordedCadetHours(state, cadet.id),
        status: cadet.status,
      };
    })
    : [];

  const columns: GridColDef<CadetRow>[] = [
    { field: 'code', headerName: 'Cadet ID', flex: 0.8, minWidth: 130 },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Button component={RouterLink} to={`/cadets/${params.row.id}`} sx={{ justifyContent: 'flex-start', px: 0, textTransform: 'none' }}>
          {params.row.name}
        </Button>
      ),
    },
    { field: 'course', headerName: 'Course', flex: 1, minWidth: 140 },
    { field: 'batch', headerName: 'Batch', flex: 0.8, minWidth: 120 },
    { field: 'progress', headerName: 'Progress', flex: 0.6, minWidth: 100 },
    { field: 'hours', headerName: 'Recorded hours', flex: 0.7, minWidth: 130 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.7,
      minWidth: 120,
      renderCell: (params) => <StatusChip status={params.row.status} />,
    },
  ];
  if (can('cadets.update')) {
    columns.push({
      field: 'edit',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <Button component={RouterLink} to={`/cadets/${params.row.id}?edit=1`} size="small" color="inherit">
          Edit
        </Button>
      ),
    });
  }

  const emptyTitle = loaded && loaded.cadets.length > 0 ? 'No cadets match these filters' : 'No cadets are in this workspace';

  return (
    <>
      <PageHeader
        title="Cadets"
        subtitle="Illustrative progress is completed required items divided by the course count. Hours are the opening balance plus completed flights."
        actions={can('cadets.create') ? (
          <Button component={RouterLink} to="/cadets/new" variant="contained" color="accent">Add cadet</Button>
        ) : null}
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <TextField
          label="Search cadets"
          placeholder="Search name or cadet ID"
          value={search}
          onChange={(event) => setFilter('q', event.target.value)}
          sx={{ flex: '1 1 220px' }}
        />
        <AppSelect
          label="Course"
          value={courseId}
          onChange={(value) => setFilter('course', value)}
          sx={{ flex: '1 1 180px' }}
          options={[
            { value: '', label: 'All courses' },
            ...(loaded?.courses ?? []).map((course) => ({ value: course.id, label: course.name })),
          ]}
        />
        <AppSelect
          label="Status"
          value={status}
          onChange={(value) => setFilter('status', value)}
          sx={{ flex: '1 1 160px' }}
          options={[
            { value: '', label: 'All statuses' },
            ...CADET_STATUS_OPTIONS.map((item) => ({ value: item, label: item })),
          ]}
        />
      </Box>
      {query.isLoading ? <CircularProgress aria-label="Loading cadets" sx={{ color: 'primary.main' }} /> : null}
      {query.isError ? (
        <EmptyState
          title="The cadet register did not load"
          body="The demonstration records could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      ) : null}
      {query.isSuccess ? (
        <>
          <RecordGrid
            rows={rows}
            columns={columns}
            emptyTitle={emptyTitle}
            emptyBody={loaded && loaded.cadets.length > 0
              ? 'Try another name, cadet ID, course, or status.'
              : 'Enrolment will add the first cadet to this register.'}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {`Showing ${rows.length} records.`}
          </Typography>
        </>
      ) : null}
    </>
  );
}
