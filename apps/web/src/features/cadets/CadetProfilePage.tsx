import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { useSnackbar } from '../../components/feedback/snackbar';
import {
  aircraftOf,
  formatDate,
  inr,
  itemName,
  progressPercent,
  recordedCadetHours,
  staffOf,
} from '../../domain/calculations';
import { DEMO_TODAY } from '../../domain/fixtures';
import type { Cadet, WorkspaceState } from '../../domain/workspace';
import { useAcademyQuery, useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { CadetForm } from './CadetForm';
import { CADET_STATUS_OPTIONS, nextApprovedFlight } from './cadetRules';
import { detailGridSx } from '../../components/layout/contentWidth';
import { cadetQueryKeys, useCadetProfileQuery } from './cadetQueries';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 600, color: tokens.navy }}>{value || '\u2014'}</Typography>
    </Box>
  );
}

export function CadetProfilePage() {
  const { cadetId = '' } = useParams();
  const query = useCadetProfileQuery(cadetId);
  const academy = useAcademyQuery();
  const { user, can } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Cadet profile" subtitle="Loading the cadet record." />
        <CircularProgress aria-label="Loading cadet profile" sx={{ color: 'primary.main' }} />
      </>
    );
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Cadet profile" subtitle="The cadet record could not be read." />
        <EmptyState
          title="The cadet profile did not load"
          body="You can try again, or return to the register."
          action={(
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>
              <Button component={RouterLink} to="/cadets" color="inherit">Back to cadets</Button>
            </Box>
          )}
        />
      </>
    );
  }

  const { lookup } = query.data;
  if (lookup.status === 'missing') {
    return (
      <>
        <PageHeader title="Cadet profile" subtitle="This address does not match a cadet in the workspace." />
        <EmptyState
          title="That cadet is not in this demo workspace."
          body="Check the address, or return to the cadets you can open."
          action={<Button component={RouterLink} to="/cadets" variant="contained" color="accent">Back to cadets</Button>}
        />
      </>
    );
  }
  if (lookup.status === 'denied') {
    return (
      <div data-testid="cadet-denied">
        <PageHeader title="Outside your assigned cadets" subtitle={`This instructor role only opens cadets assigned to ${user?.name ?? 'you'}.`} />
        <EmptyState
          title="This profile is not in your assignment"
          body="The register shows the cadets assigned to you."
          action={<Button component={RouterLink} to="/cadets" variant="contained" color="accent">Back to cadets</Button>}
        />
      </div>
    );
  }

  const cadet = lookup.cadet;
  const editing = params.get('edit') === '1' && can('cadets.update');
  if (editing) {
    return (
      <CadetForm
        mode="edit"
        cadet={cadet}
        courses={query.data.courses}
        staff={query.data.staff}
        branchName={academy.data?.branchName ?? ''}
      />
    );
  }

  const state = {
    courses: query.data.courses,
    cadets: [cadet],
    flights: query.data.flights,
    syllabi: query.data.syllabi,
    staff: query.data.staff,
    aircraft: query.data.aircraft,
    payments: query.data.payments,
    feePlans: query.data.fees?.plan ? [query.data.fees.plan] : [],
  } as WorkspaceState;
  const course = query.data.courses.find((item) => item.id === cadet.courseId);
  const instructor = query.data.staff.find((item) => item.id === cadet.instructorId);
  const syllabus = query.data.syllabi.find((item) => item.id === cadet.syllabusId);
  const nextFlight = nextApprovedFlight(query.data.flights, cadet.id);
  const feesAllowed = can('finance.view');
  const tabs = ['overview', 'training', 'flights', 'documents', 'activity', ...(feesAllowed ? ['fees'] : [])];
  const requested = params.get('tab') || 'overview';
  const tab = tabs.includes(requested) ? requested : 'overview';

  const selectTab = (next: string) => {
    const copy = new URLSearchParams(params);
    copy.delete('edit');
    copy.set('tab', next);
    setParams(copy);
  };

  const openStatus = (status: string) => {
    setPendingStatus(status);
    setReason('');
    setReasonError('');
  };

  const submitStatus = async () => {
    const trimmed = reason.trim();
    if (!pendingStatus) return;
    if (!trimmed) {
      setReasonError('A reason is required for a status change.');
      return;
    }
    setSavingStatus(true);
    const result = await repository.setCadetStatus(cadet.id, pendingStatus, trimmed, user ?? undefined);
    setSavingStatus(false);
    if (!result.ok) {
      setReasonError(result.error);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['cadets'] });
    await queryClient.invalidateQueries({ queryKey: cadetQueryKeys.detail(user?.id ?? '', cadet.id) });
    notify('Status updated.');
    setPendingStatus(null);
  };

  return (
    <>
      <Button component={RouterLink} to="/cadets" color="inherit" sx={{ mb: 1, px: 0 }}>
        Back to cadets
      </Button>
      <PageHeader
        title={`${cadet.firstName} ${cadet.lastName}`}
        subtitle={`${cadet.code} · ${course?.name ?? ''} · ${cadet.batch}`}
        actions={(
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusChip status={cadet.status} />
            {can('cadets.update') ? (
              <Button component={RouterLink} to={`/cadets/${cadet.id}?edit=1`} color="inherit">Edit</Button>
            ) : null}
            {can('cadets.update')
              ? CADET_STATUS_OPTIONS.filter((status) => status !== cadet.status).map((status) => (
                <Button key={status} size="small" color="inherit" onClick={() => openStatus(status)}>
                  {`Mark ${status}`}
                </Button>
              ))
              : null}
          </Box>
        )}
      />
      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface }}>
        <Tabs
          value={tab}
          onChange={(_event, value: string) => selectTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: `1px solid ${tokens.line}`, px: 1 }}
        >
          {tabs.map((item) => (
            <Tab key={item} value={item} label={item[0].toUpperCase() + item.slice(1)} />
          ))}
        </Tabs>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {tab === 'overview' ? <Overview cadet={cadet} instructorName={instructor?.name ?? ''} progress={progressPercent(state, cadet)} hours={recordedCadetHours(state, cadet.id)} nextFlight={nextFlight ? `${nextFlight.reference} · ${formatDate(nextFlight.date)} ${nextFlight.start}` : 'None'} /> : null}
          {tab === 'training' ? (
            <Training
              syllabus={syllabus}
              cadet={cadet}
              progress={progressPercent(state, cadet)}
              required={course?.requiredCount ?? 0}
              assessments={query.data.assessments}
              state={state}
            />
          ) : null}
          {tab === 'flights' ? <Flights state={state} flights={query.data.flights} linkFlights={can('flights.view')} /> : null}
          {tab === 'documents' ? <Documents documents={query.data.documents} linkRegister={can('documents.view')} /> : null}
          {tab === 'activity' ? <Activity audit={query.data.audit} /> : null}
          {tab === 'fees' && feesAllowed ? <Fees cadet={cadet} fees={query.data.fees} payments={query.data.payments} /> : null}
        </Box>
      </Box>
      <Dialog open={Boolean(pendingStatus)} onClose={() => setPendingStatus(null)} fullWidth maxWidth="xs">
        <DialogTitle>{`Mark cadet ${pendingStatus ?? ''}`}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This stores a demo status and an activity entry.
          </Typography>
          <TextField
            id="cadet-status-reason"
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            error={Boolean(reasonError)}
            helperText={reasonError}
            fullWidth
            required
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setPendingStatus(null)}>Cancel</Button>
          <Button variant="contained" color="accent" onClick={() => { void submitStatus(); }} disabled={savingStatus}>
            Update status
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Overview({
  cadet,
  instructorName,
  progress,
  hours,
  nextFlight,
}: {
  cadet: Cadet;
  instructorName: string;
  progress: number;
  hours: number;
  nextFlight: string;
}) {
  return (
    <Box sx={detailGridSx}>
      <Detail label="Email" value={cadet.email} />
      <Detail label="Illustrative progress" value={`${progress}%`} />
      <Detail label="Phone" value={cadet.phone} />
      <Detail label="Recorded hours" value={String(hours)} />
      <Detail label="Date of birth" value={formatDate(cadet.dob)} />
      <Detail label="Next approved flight" value={nextFlight} />
      <Detail label="Joined" value={formatDate(cadet.joiningDate)} />
      <Detail label="Instructor" value={instructorName} />
    </Box>
  );
}

function Training({
  syllabus,
  cadet,
  progress,
  required,
  assessments,
  state,
}: {
  syllabus: { label: string; phases: { id: string; name: string; items: { id: string; name: string; type: string; required: boolean }[] }[] } | undefined;
  cadet: Cadet;
  progress: number;
  required: number;
  assessments: WorkspaceState['assessments'];
  state: WorkspaceState;
}) {
  const named = syllabus ? syllabus.phases.flatMap((phase) => phase.items) : [];
  const recorded = named.filter((item) => cadet.completedItemIds.includes(item.id));
  const outstanding = named.filter((item) => item.required && !cadet.completedItemIds.includes(item.id));
  return (
    <>
      {syllabus ? (
        <>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>{syllabus.label}</Typography>
          {syllabus.phases.map((phase) => (
            <Box key={phase.id} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{phase.name}</Typography>
              {phase.items.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.75, borderBottom: `1px solid ${tokens.line}` }}>
                  <Typography variant="body2">{item.name} <Box component="span" sx={{ color: 'text.secondary' }}>{item.type}</Box></Typography>
                  <StatusChip status={cadet.completedItemIds.includes(item.id) ? 'Completed' : 'Not Assessed'} />
                </Box>
              ))}
            </Box>
          ))}
        </>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 2 }}>No syllabus is assigned.</Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        {`Illustrative progress ${progress}% (${cadet.completedRequired} of ${required}). Not an approved syllabus.`}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {`Named items recorded as completed: ${recorded.length}. Required named items not yet recorded: ${outstanding.length}. That named-item count is separate from the percentage above.`}
      </Typography>
      <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>Recorded assessments</Typography>
      {assessments.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No assessments recorded yet.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Outcome</TableCell>
              <TableCell>Assessor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assessments.map((assessment) => (
              <TableRow key={assessment.id}>
                <TableCell>{formatDate(assessment.date)}</TableCell>
                <TableCell>{itemName(state, assessment.itemId)}</TableCell>
                <TableCell>{assessment.outcome}</TableCell>
                <TableCell>{assessment.assessor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

function Flights({ state, flights, linkFlights }: { state: WorkspaceState; flights: WorkspaceState['flights']; linkFlights: boolean }) {
  if (flights.length === 0) return <Typography color="text.secondary">No flights yet.</Typography>;
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Date</TableCell>
          <TableCell>Reference</TableCell>
          <TableCell>Exercise</TableCell>
          <TableCell>Instructor</TableCell>
          <TableCell>Aircraft</TableCell>
          <TableCell>Hours</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {flights.map((flight) => (
          <TableRow key={flight.id}>
            <TableCell>{formatDate(flight.date)}</TableCell>
            <TableCell>
              {linkFlights ? <RouterLink to={`/flight-operations/${flight.id}`}>{flight.reference}</RouterLink> : flight.reference}
            </TableCell>
            <TableCell>{itemName(state, flight.itemId)}</TableCell>
            <TableCell>{staffOf(state, flight.instructorId)?.name ?? ''}</TableCell>
            <TableCell>{aircraftOf(state, flight.aircraftId)?.code ?? ''}</TableCell>
            <TableCell>{flight.actual ? flight.actual.hours : '\u2014'}</TableCell>
            <TableCell><StatusChip status={flight.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Documents({
  documents,
  linkRegister,
}: {
  documents: { id: string; title: string; review: string; expires: string }[];
  linkRegister: boolean;
}) {
  if (documents.length === 0) return <Typography color="text.secondary">No documents linked.</Typography>;
  return (
    <>
      {documents.map((document) => (
        <Box key={document.id} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, p: 2, mb: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>
            {linkRegister ? <RouterLink to="/documents">{document.title}</RouterLink> : document.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {`${document.review} · ${document.expires ? `Expires ${formatDate(document.expires)}` : 'No expiry'}`}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>Preview placeholder. Files are not stored in this browser.</Typography>
        </Box>
      ))}
    </>
  );
}

function Activity({ audit }: { audit: { id: string; action: string; actor: string; summary: string; reason: string }[] }) {
  if (audit.length === 0) return <Typography color="text.secondary">No activity yet.</Typography>;
  return (
    <>
      {audit.map((event) => (
        <Box key={event.id} sx={{ py: 1.25, borderBottom: `1px solid ${tokens.line}` }}>
          <Typography sx={{ fontWeight: 600 }}>{`${event.action} · ${event.actor}`}</Typography>
          <Typography variant="body2" color="text.secondary">
            {`${event.summary}${event.reason ? ` · ${event.reason}` : ''}`}
          </Typography>
        </Box>
      ))}
    </>
  );
}

const PAYMENT_METHODS = ['Bank transfer', 'Card', 'Cash'];

function Fees({
  cadet,
  fees,
  payments,
}: {
  cadet: Cadet;
  fees: { plan: { name: string } | undefined; total: number; paid: number; outstanding: number; overdue: boolean } | null;
  payments: { id: string; date: string; amount: number; method: string; reference: string }[];
}) {
  const { can, user } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(DEMO_TODAY);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await repository.addPayment({
      cadetId: cadet.id,
      amount,
      date,
      method,
      reference,
    }, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setAmount('');
    setReference('');
    await queryClient.invalidateQueries({ queryKey: ['finance'] });
    await queryClient.invalidateQueries({ queryKey: ['cadets'] });
    await queryClient.invalidateQueries({ queryKey: cadetQueryKeys.detail(user?.id ?? '', cadet.id) });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    notify('Payment recorded. Collected and outstanding totals now include it.');
  };

  return (
    <>
      <Typography sx={{ mb: 1 }}>
        {`${fees?.plan?.name ?? 'No plan'} · Total ${inr(fees?.total ?? 0)} · Collected ${inr(fees?.paid ?? 0)} · Outstanding ${inr(fees?.outstanding ?? 0)}`}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <Typography variant="body2">{`Fee due ${formatDate(cadet.feeDueDate)}`}</Typography>
        {fees?.overdue ? <StatusChip status="Overdue" /> : null}
      </Box>
      {payments.length === 0 ? <Typography color="text.secondary">No payments.</Typography> : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{formatDate(payment.date)}</TableCell>
                <TableCell>{inr(payment.amount)}</TableCell>
                <TableCell>{payment.method}</TableCell>
                <TableCell>{payment.reference}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        A recorded payment is not a confirmed external settlement.
      </Typography>
      {can('finance.manage') ? (
        <Box component="form" noValidate onSubmit={(event) => { void save(event); }} sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, mt: 2 }}>
          {error ? <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{error}</Alert> : null}
          <TextField type="number" label="Amount (INR)" value={amount} onChange={(event) => setAmount(event.target.value)} slotProps={{ htmlInput: { min: 1 } }} />
          <TextField type="date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <AppSelect label="Method" value={method} onChange={setMethod} options={PAYMENT_METHODS.map((item) => ({ value: item, label: item }))} />
          <TextField label="Reference" value={reference} onChange={(event) => setReference(event.target.value)} />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Button type="submit" variant="contained" color="accent" disabled={busy}>Record payment</Button>
          </Box>
        </Box>
      ) : null}
    </>
  );
}
