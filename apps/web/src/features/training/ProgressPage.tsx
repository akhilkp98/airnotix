import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { RecordGrid } from '../../components/data/RecordGrid';
import { StatusChip } from '../../components/data/StatusChip';
import { useSnackbar } from '../../components/feedback/snackbar';
import { DEMO_TODAY } from '../../domain/fixtures';
import { formatDate, fullName, itemName, progressPercent } from '../../domain/calculations';
import type { WorkspaceState } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { formPanelSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { ASSESSMENT_OUTCOMES, filterProgressCadets, validateAssessment } from './trainingRules';
import { trainingQueryKeys, useTrainingProgressQuery } from './trainingQueries';

type ProgressRow = {
  id: string;
  name: string;
  course: string;
  progress: string;
};

export function ProgressPage() {
  const query = useTrainingProgressQuery();
  const { can, user } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const [cadetId, setCadetId] = useState('');
  const [itemId, setItemId] = useState('');
  const [outcome, setOutcome] = useState<string>(ASSESSMENT_OUTCOMES[0]);
  const [date, setDate] = useState(DEMO_TODAY);
  const [comments, setComments] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ cadetId?: string; itemId?: string; outcome?: string }>({});
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: trainingQueryKeys.all });
    await queryClient.invalidateQueries({ queryKey: ['cadets'] });
    await queryClient.invalidateQueries({ queryKey: ['cadet'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateAssessment({ cadetId, itemId, outcome });
    setFieldErrors(validation.fields);
    setFormError(validation.message);
    if (!validation.ok) return;
    setSaving(true);
    const result = await repository.saveAssessment({
      cadetId,
      itemId,
      outcome,
      date,
      comments,
    }, user ?? undefined);
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setCadetId('');
    setItemId('');
    setComments('');
    setFormError('');
    notify('Assessment recorded.');
    await refresh();
  };

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Progress" subtitle="Illustrative progress is the stored counter divided by the course required count. It is not regulatory eligibility or readiness." />
        <CircularProgress aria-label="Loading progress" sx={{ color: 'primary.main' }} />
      </>
    );
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Progress" subtitle="Cadet progress could not be read." />
        <EmptyState
          title="Cadet progress did not load"
          body="The demonstration records could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      </>
    );
  }

  const { cadets, courses, syllabi, assessments } = query.data;
  const state = { courses, cadets, syllabi } as WorkspaceState;
  const visible = filterProgressCadets(cadets, search);
  const items = syllabi.flatMap((syllabus) => syllabus.phases.flatMap((phase) => phase.items));
  const rows: ProgressRow[] = visible.map((cadet) => ({
    id: cadet.id,
    name: `${cadet.firstName} ${cadet.lastName}`,
    course: courses.find((course) => course.id === cadet.courseId)?.name ?? '',
    progress: `${progressPercent(state, cadet)}%`,
  }));
  const columns: GridColDef<ProgressRow>[] = [
    {
      field: 'name',
      headerName: 'Cadet',
      flex: 1.2,
      minWidth: 160,
      renderCell: (cell) => (
        <Button component={RouterLink} to={`/cadets/${cell.row.id}?tab=training`} sx={{ justifyContent: 'flex-start', px: 0, textTransform: 'none' }}>
          {cell.row.name}
        </Button>
      ),
    },
    { field: 'course', headerName: 'Course', flex: 1, minWidth: 140 },
    { field: 'progress', headerName: 'Illustrative progress', flex: 0.8, minWidth: 160 },
  ];

  return (
    <>
      <PageHeader
        title="Progress"
        subtitle="Illustrative progress is the stored counter divided by the course required count. It is not a count of named syllabus items, and it is not regulatory eligibility or readiness."
      />
      <Box sx={{ ...formPanelSx, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 3 }}>
        {can('training.assess') ? (
          <>
            <Typography component="h2" sx={{ fontWeight: 600, color: tokens.navy }}>Record assessment</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              Satisfactory increases illustrative progress by one the first time that item is recorded. This does not certify competence.
            </Typography>
            {formError ? <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert> : null}
            <Box component="form" noValidate onSubmit={(event) => { void save(event); }} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
              <AppSelect
                required
                label="Cadet"
                value={cadetId}
                onChange={setCadetId}
                error={Boolean(fieldErrors.cadetId)}
                helperText={fieldErrors.cadetId}
                options={[{ value: '', label: 'Choose' }, ...cadets.map((cadet) => ({ value: cadet.id, label: `${cadet.firstName} ${cadet.lastName}` }))]}
              />
              <AppSelect
                required
                label="Training item"
                value={itemId}
                onChange={setItemId}
                error={Boolean(fieldErrors.itemId)}
                helperText={fieldErrors.itemId}
                options={[{ value: '', label: 'Choose' }, ...items.map((item) => ({ value: item.id, label: item.name }))]}
              />
              <AppSelect
                label="Outcome"
                value={outcome}
                onChange={setOutcome}
                error={Boolean(fieldErrors.outcome)}
                helperText={fieldErrors.outcome}
                options={ASSESSMENT_OUTCOMES.map((value) => ({ value, label: value }))}
              />
              <TextField
                type="date"
                label="Date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Comments"
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                sx={{ gridColumn: { md: 'span 2' } }}
              />
              <Box>
                <Button type="submit" variant="contained" color="accent" disabled={saving}>Save assessment</Button>
              </Box>
            </Box>
          </>
        ) : (
          <Typography color="text.secondary">Your role can review assessments already recorded.</Typography>
        )}
        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Cadet</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Outcome</TableCell>
              <TableCell>Assessor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No assessments recorded yet.</TableCell>
              </TableRow>
            ) : assessments.map((assessment) => (
              <TableRow key={assessment.id}>
                <TableCell>{formatDate(assessment.date)}</TableCell>
                <TableCell>{fullName(cadets.find((cadet) => cadet.id === assessment.cadetId))}</TableCell>
                <TableCell>{itemName(state, assessment.itemId)}</TableCell>
                <TableCell><StatusChip status={assessment.outcome} /></TableCell>
                <TableCell>{assessment.assessor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <TextField
        label="Search cadets"
        placeholder="Search name or cadet ID"
        value={search}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          if (event.target.value) next.set('q', event.target.value);
          else next.delete('q');
          setParams(next);
        }}
        sx={{ mb: 2, maxWidth: 360 }}
      />
      <RecordGrid
        rows={rows}
        columns={columns}
        emptyTitle={cadets.length > 0 ? 'No cadets match this search' : 'No cadets are in this workspace'}
        emptyBody={cadets.length > 0 ? 'Try another name or cadet ID.' : 'Progress is shown for cadets in this workspace.'}
      />
    </>
  );
}
