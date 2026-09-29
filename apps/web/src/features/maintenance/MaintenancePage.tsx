import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { KpiCard } from '../../components/data/KpiCard';
import { SummaryGrid } from '../../components/data/SummaryGrid';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { useSnackbar } from '../../components/feedback/snackbar';
import { formatDate, recordedAircraftHours } from '../../domain/calculations';
import type { WorkspaceState } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { formPanelSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { refreshAfterMaintenanceChange, useMaintenanceQuery } from './maintenanceQueries';
import { DEFECT_SEVERITIES, WORK_STATUS_OPTIONS, openDefects, openWorkOrders } from './maintenanceRules';

export function MaintenancePage() {
  const query = useMaintenanceQuery();
  const { can, user } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [description, setDescription] = useState('');
  const [aircraftId, setAircraftId] = useState('');
  const [severity, setSeverity] = useState<string>(DEFECT_SEVERITIES[2]);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [releaseNote, setReleaseNote] = useState('');
  const [releaseError, setReleaseError] = useState('');

  if (query.isLoading) return <CircularProgress aria-label="Loading maintenance" sx={{ color: 'primary.main' }} />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Maintenance records did not load"
        body="The demonstration defects and work orders could not be read. You can try again."
        action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
      />
    );
  }

  const { aircraft, defects, workOrders, documents, staff, flights } = query.data;
  const selectedAircraft = aircraftId || aircraft[0]?.id || '';
  const hoursState = { aircraft, flights } as WorkspaceState;
  const aircraftDocuments = documents.filter((item) => item.ownerType === 'Aircraft');
  const notAvailable = aircraft.filter((item) => item.status !== 'Available').length;

  const saveDefect = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await repository.addDefect({
      aircraftId: selectedAircraft,
      description,
      severity,
    }, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormError('');
    setDescription('');
    await refreshAfterMaintenanceChange(queryClient);
    notify('Defect and work order recorded.');
  };

  const setWorkStatus = async (id: string, status: string) => {
    setBusy(true);
    const result = await repository.updateWorkOrder(id, status, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    await refreshAfterMaintenanceChange(queryClient);
  };

  const saveRelease = async () => {
    if (!releaseId) return;
    setBusy(true);
    const result = await repository.recordRelease(releaseId, releaseNote, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setReleaseError(result.error);
      return;
    }
    setReleaseId(null);
    setReleaseNote('');
    setReleaseError('');
    await refreshAfterMaintenanceChange(queryClient);
    notify('Release entry recorded.');
  };

  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="Defects, work orders, and release notes from the workspace. A release entry records that someone wrote a note. It does not decide serviceability or return an aircraft to Available."
      />
      <SummaryGrid>
        <KpiCard label="Open defects" value={String(openDefects(defects).length)} />
        <KpiCard label="Open work orders" value={String(openWorkOrders(workOrders).length)} hint="Excludes Completed and Release recorded." />
        <KpiCard label="Aircraft not available" value={String(notAvailable)} hint="Planning status other than Available." />
      </SummaryGrid>

      {can('maintenance.record') ? (
        <Box component="form" noValidate onSubmit={(event) => { void saveDefect(event); }} sx={{ ...formPanelSx, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
          <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Record defect</Typography>
          {formError ? <Alert severity="error" sx={{ mb: 1.5 }}>{formError}</Alert> : null}
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 2fr' } }}>
            <AppSelect label="Aircraft" value={selectedAircraft} onChange={setAircraftId} options={aircraft.map((item) => ({ value: item.id, label: item.code }))} />
            <AppSelect label="Severity" value={severity} onChange={setSeverity} options={DEFECT_SEVERITIES.map((item) => ({ value: item, label: item }))} />
            <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </Box>
          <Button type="submit" variant="contained" color="accent" disabled={busy} sx={{ mt: 1.5 }}>Save defect</Button>
        </Box>
      ) : null}

      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Defects</Typography>
        {defects.length === 0 ? <Typography color="text.secondary">No defects are recorded.</Typography> : defects.map((item) => {
          const code = aircraft.find((entry) => entry.id === item.aircraftId)?.code ?? '';
          return (
            <Box key={item.id} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ minWidth: 120 }}>{code}</Typography>
              <Typography sx={{ flex: 1 }}>{item.description}</Typography>
              <StatusChip status={item.severity} />
              <StatusChip status={item.status} />
            </Box>
          );
        })}
      </Box>

      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Work orders</Typography>
        {workOrders.length === 0 ? <Typography color="text.secondary">No work orders are recorded.</Typography> : workOrders.map((item) => {
          const code = aircraft.find((entry) => entry.id === item.aircraftId)?.code ?? '';
          const assignee = staff.find((entry) => entry.id === item.assigneeId)?.name ?? '';
          return (
            <Box key={item.id} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 600 }}>{item.reference}</Typography>
                <Typography>{code}</Typography>
                <StatusChip status={item.status} />
              </Box>
              <Typography variant="body2" color="text.secondary">{item.description}{assignee ? ` · ${assignee}` : ''}</Typography>
              {item.release ? (
                <Typography variant="body2">
                  {`Authorized release recorded by ${item.release.by}. Not a system serviceability decision.`}
                </Typography>
              ) : null}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {can('maintenance.record') ? WORK_STATUS_OPTIONS.map((status) => (
                  <Button key={status} size="small" color="inherit" disabled={busy} onClick={() => { void setWorkStatus(item.id, status); }}>
                    {`${item.reference} ${status}`}
                  </Button>
                )) : null}
                {can('maintenance.release_record') ? (
                  <Button size="small" variant="contained" color="accent" disabled={busy} onClick={() => { setReleaseNote(''); setReleaseError(''); setReleaseId(item.id); }}>
                    {`Record release ${item.reference}`}
                  </Button>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Configured hour thresholds</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          The prototype has no scheduled-task records. Each number below is the aircraft’s configured next threshold, not an interval, life limit, or due task.
        </Typography>
        {aircraft.map((item) => (
          <Typography key={item.id} sx={{ mb: 0.5 }}>
            {`${item.code} · recorded ${recordedAircraftHours(hoursState, item.id)} h · threshold ${item.nextMaintenanceHours} h · ${item.status}`}
          </Typography>
        ))}
      </Box>

      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
        <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Related documents</Typography>
        {aircraftDocuments.length === 0 ? <Typography color="text.secondary">No aircraft documents are on the register.</Typography> : aircraftDocuments.map((item) => {
          const code = aircraft.find((entry) => entry.id === item.ownerId)?.code ?? item.ownerId;
          return (
            <Typography key={item.id} sx={{ mb: 0.75 }}>
              {`${item.title} · ${code} · ${item.review}${item.expires ? ` · expires ${formatDate(item.expires)}` : ''}`}
            </Typography>
          );
        })}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Document review stays on the documents screen. This list does not accept or reject a file.
          {can('documents.view') ? <> <RouterLink to="/documents">Open the document register</RouterLink>.</> : null}
        </Typography>
      </Box>

      <Dialog open={Boolean(releaseId)} onClose={() => { if (!busy) setReleaseId(null); }} fullWidth maxWidth="sm">
        <DialogTitle>Record authorized release</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This records that an authorized person made an entry. The prototype does not decide serviceability.
          </Typography>
          {releaseError ? <Alert severity="error" sx={{ mb: 1.5 }}>{releaseError}</Alert> : null}
          <TextField label="Release note" value={releaseNote} onChange={(event) => setReleaseNote(event.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setReleaseId(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" color="accent" onClick={() => { void saveRelease(); }} disabled={busy}>Record</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
