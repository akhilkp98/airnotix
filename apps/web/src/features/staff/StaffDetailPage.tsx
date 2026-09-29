import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { useSnackbar } from '../../components/feedback/snackbar';
import { formatDate } from '../../domain/calculations';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { formPanelSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { refreshAfterAvailabilityChange, useStaffDetailQuery } from './staffQueries';
import { AVAILABILITY_KINDS, DEFAULT_LEAVE_DATE, qualificationBeforeDemoDay } from './staffRules';

export function StaffDetailPage() {
  const { staffId = '' } = useParams();
  const query = useStaffDetailQuery(staffId);
  const { can } = useAuth();

  if (query.isLoading) return <CircularProgress aria-label="Loading staff" sx={{ color: 'primary.main' }} />;
  if (query.isError) {
    return (
      <EmptyState
        title="This staff record did not load"
        body="The demonstration record could not be read. You can try again."
        action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
      />
    );
  }
  if (!query.data?.person) {
    return (
      <>
        <Button component={RouterLink} to="/hr" color="inherit" sx={{ mb: 1, px: 0 }}>Back to staff</Button>
        <EmptyState title="Staff member not found." body="This address does not match a staff record in the workspace." />
      </>
    );
  }

  const { person, availability, documents } = query.data;
  const blocks = availability.filter((item) => item.staffId === person.id);
  const linkedDocuments = documents.filter((item) => item.ownerType === 'Staff' && item.ownerId === person.id);

  return (
    <>
      <Button component={RouterLink} to="/hr" color="inherit" sx={{ mb: 1, px: 0 }}>Back to staff</Button>
      <PageHeader
        title={person.name}
        subtitle={`${person.code} · ${person.role} · ${person.base}`}
        actions={<StatusChip status={person.availability} />}
      />
      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Typography sx={{ mb: 2 }}>{person.email}</Typography>
        <Typography component="h2" sx={{ m: 0, mb: 1, fontSize: '1rem', color: tokens.navy }}>Illustrative qualifications</Typography>
        <Box component="ul" sx={{ m: 0, mb: 2, pl: 2.5 }}>
          {person.qualifications.map((item) => (
            <Box component="li" key={`${item.name}-${item.expires}`} sx={{ mb: 0.75 }}>
              {`${item.name} · dated through ${formatDate(item.expires)}`}
              {qualificationBeforeDemoDay(item.expires) ? (
                <Alert severity="info" sx={{ mt: 0.75 }}>
                  Dated before the demo day. Flight planning treats that as informational only. It is not an authorisation and it does not block a flight by itself.
                </Alert>
              ) : null}
            </Box>
          ))}
        </Box>
        <Typography component="h2" sx={{ m: 0, mb: 1, fontSize: '1rem', color: tokens.navy }}>Availability blocks</Typography>
        {blocks.length === 0 ? <Typography color="text.secondary">None</Typography> : (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {blocks.map((item) => (
              <Box component="li" key={item.id} sx={{ mb: 0.75 }}>
                {`${formatDate(item.date)} ${item.start}–${item.end} · ${item.kind} · ${item.reason}`}
              </Box>
            ))}
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          An overlapping block is a scheduling blocker on a flight. The stored availability label on the person is not recalculated from these blocks.
        </Typography>
        {can('staff.manage') ? <AvailabilityForm staffId={person.id} /> : null}
      </Box>
      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
        <Typography component="h2" sx={{ m: 0, mb: 1, fontSize: '1rem', color: tokens.navy }}>Related documents</Typography>
        {linkedDocuments.length === 0 ? <Typography color="text.secondary">No documents on the register name this person.</Typography> : linkedDocuments.map((item) => (
          <Typography key={item.id}>
            {can('documents.view') ? <RouterLink to="/documents">{item.title}</RouterLink> : item.title}
            {` · ${item.review}${item.expires ? ` · expires ${formatDate(item.expires)}` : ''}`}
          </Typography>
        ))}
      </Box>
    </>
  );
}

function AvailabilityForm({ staffId }: { staffId: string }) {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [date, setDate] = useState(DEFAULT_LEAVE_DATE);
  const [start, setStart] = useState('13:00');
  const [end, setEnd] = useState('18:00');
  const [kind, setKind] = useState<string>(AVAILABILITY_KINDS[0]);
  const [reason, setReason] = useState('Demo leave');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await repository.addAvailability({ staffId, date, start, end, kind, reason }, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    await refreshAfterAvailabilityChange(queryClient);
    notify('Availability saved. Scheduling will warn on an overlap.');
  };

  return (
    <Box component="form" noValidate onSubmit={(event) => { void onSubmit(event); }} sx={{ ...formPanelSx, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, minmax(0, 1fr))' }, mt: 2 }}>
      {error ? <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{error}</Alert> : null}
      <TextField type="date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField type="time" label="Start" value={start} onChange={(event) => setStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField type="time" label="End" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <AppSelect label="Kind" value={kind} onChange={setKind} options={AVAILABILITY_KINDS.map((item) => ({ value: item, label: item }))} />
      <TextField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Button type="submit" variant="contained" color="accent" disabled={busy}>Add block</Button>
      </Box>
    </Box>
  );
}
