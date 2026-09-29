import { useState, type FormEvent, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { detailGridSx, formPanelSx } from '../../components/layout/contentWidth';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { useSnackbar } from '../../components/feedback/snackbar';
import { blockers, formatDate, itemName } from '../../domain/calculations';
import type { WorkspaceState } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { FlightForm } from './FlightForm';
import { FlightIssues } from './FlightIssues';
import { refreshAfterFlightChange, useFlightDetailQuery, useFlightFormQuery } from './flightQueries';
import { ATTENDANCE_OPTIONS, COMPLETION_OUTCOMES, validateCompletion, validateCorrection } from './flightRules';

export function FlightDetailPage() {
  const { flightId = '' } = useParams();
  const query = useFlightDetailQuery(flightId);
  const formQuery = useFlightFormQuery();
  const { user, can } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<'Approved' | 'Rejected' | 'cancel' | null>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [busy, setBusy] = useState(false);

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Flight" subtitle="Loading the flight record." />
        <CircularProgress aria-label="Loading flight" sx={{ color: 'primary.main' }} />
      </>
    );
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Flight" subtitle="The flight record could not be read." />
        <EmptyState
          title="The flight record did not load"
          body="The demonstration records could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      </>
    );
  }
  if (!query.data.flight) {
    return (
      <>
        <PageHeader title="Flight" subtitle="That flight is not in the demo calendar." />
        <EmptyState
          title="That flight is not in the demo calendar"
          body="Check the reference, or return to the schedule."
          action={<Button component={RouterLink} to="/flight-operations" variant="contained" color="accent">Back to flights</Button>}
        />
      </>
    );
  }

  const flight = query.data.flight;
  const editing = params.get('edit') === '1'
    && can('flights.update')
    && (flight.status === 'Draft' || flight.status === 'Rejected');
  if (editing) {
    if (formQuery.isLoading) {
      return <CircularProgress aria-label="Loading flight form" sx={{ color: 'primary.main' }} />;
    }
    if (formQuery.isError || !formQuery.data) {
      return <EmptyState title="The flight form did not load" body="You can try again." action={<Button onClick={() => { void formQuery.refetch(); }}>Try again</Button>} />;
    }
    return (
      <FlightForm
        flight={flight}
        cadets={formQuery.data.cadets}
        staff={formQuery.data.staff}
        aircraft={formQuery.data.aircraft}
        items={formQuery.data.items}
      />
    );
  }

  const state = { syllabi: query.data.syllabi, staff: query.data.staff, aircraft: query.data.aircraft } as WorkspaceState;
  const cadetName = query.data.labels.find((label) => label.id === flight.cadetId)?.name ?? 'Unknown cadet';
  const instructor = query.data.staff.find((member) => member.id === flight.instructorId);
  const aircraft = query.data.aircraft.find((item) => item.id === flight.aircraftId);
  const showComplete = params.get('complete') === '1' && flight.status === 'Approved' && can('flights.complete');
  const blocking = blockers(query.data.issues);

  const refresh = async () => {
    await refreshAfterFlightChange(queryClient);
  };

  const submit = async () => {
    setBusy(true);
    const result = await repository.submitFlight(flight, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setActionError('');
    notify('Submitted for approval.');
    await refresh();
  };

  const openDecision = (decision: 'Approved' | 'Rejected') => {
    if (decision === 'Approved' && blocking.length > 0) {
      setActionError(blocking[0]?.message ?? 'Resolve the scheduling conflicts before approval.');
      return;
    }
    setComment('');
    setCommentError('');
    setDialog(decision);
  };

  const confirmDialog = async () => {
    const text = comment.trim();
    if (!text) {
      setCommentError(dialog === 'cancel' ? 'A reason is required.' : 'A comment is required.');
      return;
    }
    if (!dialog) return;
    setBusy(true);
    const result = dialog === 'cancel'
      ? await repository.cancelFlight(flight.id, text, user ?? undefined)
      : await repository.decideFlight(flight.id, dialog, text, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setCommentError(result.error);
      return;
    }
    setDialog(null);
    setActionError('');
    notify(dialog === 'cancel' ? 'Flight cancelled.' : `Flight ${dialog.toLowerCase()}.`);
    await refresh();
  };

  return (
    <>
      <Button component={RouterLink} to="/flight-operations" color="inherit" sx={{ mb: 1, px: 0 }}>Back to flights</Button>
      <PageHeader
        title={flight.reference}
        subtitle={`${formatDate(flight.date)} ${flight.start}–${flight.end} · ${flight.flightType}`}
        actions={<StatusChip status={flight.status} />}
      />
      {actionError ? <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert> : null}
      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Box sx={detailGridSx}>
          <Detail label="Cadet" value={can('cadets.view') ? <RouterLink to={`/cadets/${flight.cadetId}`}>{cadetName}</RouterLink> : cadetName} />
          <Detail label="Training item" value={itemName(state, flight.itemId)} />
          <Detail label="Instructor" value={instructor?.name ?? ''} />
          <Detail
            label="Aircraft"
            value={aircraft
              ? (can('fleet.view')
                ? <RouterLink to={`/fleet/${aircraft.id}`}>{`${aircraft.code} · ${aircraft.status}`}</RouterLink>
                : `${aircraft.code} · ${aircraft.status}`)
              : ''}
          />
          <Detail label="Notes" value={flight.notes || '\u2014'} wide />
          <Detail label="Decision" value={flight.approval ? `${flight.approval.decision} by ${flight.approval.by}: ${flight.approval.comment}` : 'Not decided'} wide />
          {flight.submittedBy ? <Detail label="Submitted by" value={flight.submittedBy} /> : null}
          {flight.actual ? <Detail label="Actual" value={`${flight.actual.hours} h · ${flight.actual.outcome} · ${flight.actual.comments || ''}`} wide /> : null}
        </Box>
        <Box sx={{ mt: 2 }}>
          <FlightIssues issues={query.data.issues} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          A qualification warning does not block approval. An overlap, leave block, or aircraft planning restriction does. None of these checks authorize a flight release.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          {(flight.status === 'Draft' || flight.status === 'Rejected') && can('flights.update') ? (
            <Button component={RouterLink} to={`/flight-operations/${flight.id}?edit=1`} color="inherit">Edit draft</Button>
          ) : null}
          {flight.status === 'Draft' && can('flights.submit') ? (
            <Button variant="contained" color="accent" disabled={busy} onClick={() => { void submit(); }}>Submit for approval</Button>
          ) : null}
          {flight.status === 'Awaiting approval' && can('flights.approve') ? (
            <>
              <Button variant="contained" color="accent" disabled={busy} onClick={() => openDecision('Approved')}>Approve</Button>
              <Button color="error" disabled={busy} onClick={() => openDecision('Rejected')}>Reject</Button>
            </>
          ) : null}
          {flight.status !== 'Completed' && flight.status !== 'Cancelled' && (can('flights.update') || can('flights.approve')) ? (
            <Button color="error" disabled={busy} onClick={() => { setComment(''); setCommentError(''); setDialog('cancel'); }}>Cancel</Button>
          ) : null}
          {flight.status === 'Approved' && can('flights.complete') ? (
            <Button component={RouterLink} to={`/flight-operations/${flight.id}?complete=1`} variant="contained" color="accent">Record completion</Button>
          ) : null}
        </Box>
      </Box>
      {query.data.audit.length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>Activity</Typography>
          {query.data.audit.map((event) => (
            <Typography key={event.id} variant="body2" sx={{ mb: 0.75 }}>
              <strong>{event.action}</strong>
              {` · ${event.actor} · ${event.summary}`}
              {event.reason ? ` · ${event.reason}` : ''}
            </Typography>
          ))}
        </Box>
      ) : null}
      {showComplete ? (
        <CompletionForm
          flightId={flight.id}
          start={flight.start}
          end={flight.end}
          onDone={async () => {
            setParams((current) => {
              const next = new URLSearchParams(current);
              next.delete('complete');
              return next;
            });
            notify('Completion recorded. Cadet and aircraft hours now include it.');
            await refresh();
          }}
        />
      ) : null}
      {flight.status === 'Completed' && flight.actual && can('flights.complete') ? (
        <CorrectionForm flightId={flight.id} hours={String(flight.actual.hours)} onDone={refresh} />
      ) : null}
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>{dialog === 'cancel' ? 'Cancel flight' : `${dialog ?? ''} flight`}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {dialog === 'cancel' ? 'A reason is stored with the cancellation.' : 'A comment is stored with the decision. Rejecting does not require the overlap to be cleared.'}
          </Typography>
          <TextField
            label={dialog === 'cancel' ? 'Reason' : 'Comment'}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            error={Boolean(commentError)}
            helperText={commentError}
            fullWidth
            required
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" color={dialog === 'Approved' ? 'accent' : 'error'} disabled={busy} onClick={() => { void confirmDialog(); }}>
            {dialog === 'cancel' ? 'Cancel flight' : dialog}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <Box sx={{ minWidth: 0, ...(wide ? { gridColumn: '1 / -1' } : null) }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</Typography>
    </Box>
  );
}

function CompletionForm({
  flightId,
  start,
  end,
  onDone,
}: {
  flightId: string;
  start: string;
  end: string;
  onDone: () => Promise<void>;
}) {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  const [actualStart, setActualStart] = useState(start);
  const [actualEnd, setActualEnd] = useState(end);
  const [hours, setHours] = useState('1.2');
  const [outcome, setOutcome] = useState<string>(COMPLETION_OUTCOMES[0]);
  const [attendance, setAttendance] = useState<string>(ATTENDANCE_OPTIONS[0]);
  const [comments, setComments] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateCompletion>['fields']>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateCompletion({ start: actualStart, end: actualEnd, hours, outcome });
    setFieldErrors(validation.fields);
    setFormError(validation.message);
    if (!validation.ok) return;
    setBusy(true);
    const result = await repository.completeFlight(flightId, {
      start: actualStart,
      end: actualEnd,
      hours,
      outcome,
      comments,
      attendance,
      followUp,
    }, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    await onDone();
  };

  return (
    <Box component="form" noValidate onSubmit={(event) => { void submit(event); }} sx={{ ...formPanelSx, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
      <Typography sx={{ fontWeight: 600, mb: 1 }}>Record completion</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Hours are the value entered here. The first Satisfactory outcome for this training item increases illustrative progress by one. Repeating completion does not add the hours again.
      </Typography>
      {formError ? <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
        <TextField type="time" label="Actual start" value={actualStart} onChange={(event) => setActualStart(event.target.value)} error={Boolean(fieldErrors.start)} helperText={fieldErrors.start} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="time" label="Actual end" value={actualEnd} onChange={(event) => setActualEnd(event.target.value)} error={Boolean(fieldErrors.end)} helperText={fieldErrors.end} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="number" label="Actual hours" value={hours} onChange={(event) => setHours(event.target.value)} error={Boolean(fieldErrors.hours)} helperText={fieldErrors.hours} slotProps={{ htmlInput: { min: 0.1, step: 0.1 } }} />
        <AppSelect label="Outcome" value={outcome} onChange={setOutcome} options={COMPLETION_OUTCOMES.map((item) => ({ value: item, label: item }))} />
        <AppSelect label="Attendance" value={attendance} onChange={setAttendance} options={ATTENDANCE_OPTIONS.map((item) => ({ value: item, label: item }))} />
        <TextField label="Comments" value={comments} onChange={(event) => setComments(event.target.value)} sx={{ gridColumn: { md: 'span 2' } }} />
        <FormControlLabel control={<Checkbox checked={followUp} onChange={(event) => setFollowUp(event.target.checked)} />} label="Follow-up required" />
      </Box>
      <Button type="submit" variant="contained" color="accent" disabled={busy} sx={{ mt: 2 }}>Submit completion</Button>
    </Box>
  );
}

function CorrectionForm({ flightId, hours, onDone }: { flightId: string; hours: string; onDone: () => Promise<void> }) {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  const { notify } = useSnackbar();
  const [revised, setRevised] = useState(hours);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateCorrection>['fields']>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateCorrection(revised, reason);
    setFieldErrors(validation.fields);
    setFormError(validation.message);
    if (!validation.ok) return;
    setBusy(true);
    const result = await repository.correctFlight(flightId, revised, reason, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setReason('');
    notify('Correction stored in the activity log.');
    await onDone();
  };

  return (
    <Box component="form" noValidate onSubmit={(event) => { void submit(event); }} sx={{ ...formPanelSx, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
      <Typography sx={{ fontWeight: 600, mb: 1 }}>Correction</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A correction changes the recorded hours only. It does not reverse training progress.
      </Typography>
      {formError ? <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px 1fr' }, gap: 2 }}>
        <TextField type="number" label="Revised hours" value={revised} onChange={(event) => setRevised(event.target.value)} error={Boolean(fieldErrors.hours)} helperText={fieldErrors.hours} slotProps={{ htmlInput: { min: 0.1, step: 0.1 } }} />
        <TextField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} error={Boolean(fieldErrors.reason)} helperText={fieldErrors.reason} />
      </Box>
      <Button type="submit" color="inherit" disabled={busy} sx={{ mt: 2 }}>Save correction</Button>
    </Box>
  );
}
