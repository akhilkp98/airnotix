import { useState, type FormEvent, type ReactNode } from 'react';
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
import { formatDate, recordedAircraftHours } from '../../domain/calculations';
import type { Aircraft, WorkspaceState } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { detailGridSx, formPanelSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { refreshAfterAircraftChange, useAircraftDetailQuery } from './fleetQueries';
import { AIRCRAFT_STATUSES, DEFAULT_RESTRICTION_UNTIL } from './fleetRules';

export function AircraftDetailPage() {
  const { aircraftId = '' } = useParams();
  const query = useAircraftDetailQuery(aircraftId);
  const { can } = useAuth();

  if (query.isLoading) return <CircularProgress aria-label="Loading aircraft" sx={{ color: 'primary.main' }} />;
  if (query.isError) {
    return (
      <EmptyState
        title="This aircraft record did not load"
        body="The demonstration record could not be read. You can try again."
        action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
      />
    );
  }
  if (!query.data?.aircraft) {
    return (
      <>
        <Button component={RouterLink} to="/fleet" color="inherit" sx={{ mb: 1, px: 0 }}>Back to fleet</Button>
        <EmptyState title="Aircraft not found." body="This address does not match an aircraft in the workspace." />
      </>
    );
  }

  const { aircraft, flights, defects, workOrders, documents } = query.data;
  const state = { aircraft: [aircraft], flights } as WorkspaceState;
  const linkedFlights = flights.filter((flight) => flight.aircraftId === aircraft.id);
  const linkedDefects = defects.filter((item) => item.aircraftId === aircraft.id);
  const linkedOrders = workOrders.filter((item) => item.aircraftId === aircraft.id);
  const linkedDocuments = documents.filter((item) => item.ownerType === 'Aircraft' && item.ownerId === aircraft.id);

  return (
    <>
      <Button component={RouterLink} to="/fleet" color="inherit" sx={{ mb: 1, px: 0 }}>Back to fleet</Button>
      <PageHeader
        title={aircraft.code}
        subtitle={`${aircraft.type} · ${aircraft.base}`}
        actions={<StatusChip status={aircraft.status} />}
      />
      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Box sx={{ ...detailGridSx, mb: 0 }}>
          <Detail label="Recorded hours" value={String(recordedAircraftHours(state, aircraft.id))} />
          <Detail label="Next configured threshold" value={`${aircraft.nextMaintenanceHours} h`} />
        </Box>
        {aircraft.restriction ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {`${aircraft.restriction.reason} Planning window ${formatDate(aircraft.restriction.from)} to ${formatDate(aircraft.restriction.until)}.`}
          </Alert>
        ) : null}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          A status here is a planning record. It is not an airworthiness or release decision. The threshold is a configured number, not a maintenance programme.
        </Typography>
        {can('fleet.manage') ? <StatusForm aircraft={aircraft} /> : null}
      </Box>

      <Section title="Flights using this aircraft">
        {linkedFlights.length === 0 ? <Typography color="text.secondary">No linked flights.</Typography> : (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {linkedFlights.map((flight) => (
              <Box component="li" key={flight.id} sx={{ mb: 0.75 }}>
                {`${formatDate(flight.date)} · `}
                {can('flights.view') ? <RouterLink to={`/flight-operations/${flight.id}`}>{flight.reference}</RouterLink> : flight.reference}
                {` · ${flight.status}`}
              </Box>
            ))}
          </Box>
        )}
      </Section>

      <Section title="Linked maintenance">
        {linkedDefects.length === 0 && linkedOrders.length === 0 ? (
          <Typography color="text.secondary">No maintenance records are linked to this aircraft.</Typography>
        ) : (
          <>
            {linkedDefects.map((item) => (
              <Typography key={item.id} sx={{ mb: 0.75 }}>{`${item.description} · ${item.severity} · ${item.status}`}</Typography>
            ))}
            {linkedOrders.map((item) => (
              <Typography key={item.id} sx={{ mb: 0.75 }}>
                {`${item.reference} · ${item.status} · ${item.description}`}
                {item.release ? ` Authorized release recorded by ${item.release.by}. Not a system serviceability decision.` : ''}
              </Typography>
            ))}
          </>
        )}
      </Section>

      <Section title="Related documents">
        {linkedDocuments.length === 0 ? <Typography color="text.secondary">No documents on the register name this aircraft.</Typography> : (
          linkedDocuments.map((item) => (
            <Typography key={item.id} sx={{ mb: 0.75 }}>
              {`${item.title} · uploaded ${formatDate(item.uploaded)} · ${item.expires ? `expires ${formatDate(item.expires)}` : 'no expiry'} · ${item.review}`}
            </Typography>
          ))
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          These are existing register rows. This screen does not review or release them.
          {can('documents.view') ? <> <RouterLink to="/documents">Open the document register</RouterLink>.</> : null}
        </Typography>
      </Section>
    </>
  );
}

function StatusForm({ aircraft }: { aircraft: Aircraft }) {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [status, setStatus] = useState(aircraft.status);
  const [until, setUntil] = useState(aircraft.restriction?.until ?? DEFAULT_RESTRICTION_UNTIL);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await repository.setAircraftStatus(aircraft.id, status, reason, until, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setReason('');
    await refreshAfterAircraftChange(queryClient);
    notify('Aircraft planning status updated.');
  };

  return (
    <Box component="form" noValidate onSubmit={(event) => { void onSubmit(event); }} sx={{ ...formPanelSx, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 2fr' }, mt: 2 }}>
      {error ? <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{error}</Alert> : null}
      <AppSelect label="Status" value={status} onChange={setStatus} options={AIRCRAFT_STATUSES.map((item) => ({ value: item, label: item }))} />
      <TextField type="date" label="Until" value={until} onChange={(event) => setUntil(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField label="Reason" placeholder="Required unless available" value={reason} onChange={(event) => setReason(event.target.value)} />
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Button type="submit" variant="contained" color="accent" disabled={busy}>Update status</Button>
      </Box>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
      <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>{title}</Typography>
      {children}
    </Box>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Typography sx={{ mb: 0.5 }}>
      <Box component="span" sx={{ color: 'text.secondary' }}>{`${label}: `}</Box>
      {value}
    </Typography>
  );
}
