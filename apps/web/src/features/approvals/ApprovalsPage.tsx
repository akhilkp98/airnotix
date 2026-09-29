import { useState } from 'react';
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
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { useSnackbar } from '../../components/feedback/snackbar';
import { formatDate } from '../../domain/calculations';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { refreshAfterFlightChange } from '../flights/flightQueries';
import { useApprovalsQuery } from './approvalQueries';

export function ApprovalsPage() {
  const query = useApprovalsQuery();
  const { can, user } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [decision, setDecision] = useState<{ id: string; choice: 'Approved' | 'Rejected' } | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (query.isLoading) return <CircularProgress aria-label="Loading approvals" sx={{ color: 'primary.main' }} />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Approvals did not load"
        body="The demonstration queue could not be read. You can try again."
        action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
      />
    );
  }

  const nameFor = (cadetId: string) => query.data?.labels.find((item) => item.id === cadetId)?.name ?? '';

  const openDecision = (id: string, choice: 'Approved' | 'Rejected') => {
    setComment('');
    setError('');
    setDecision({ id, choice });
  };

  const saveDecision = async () => {
    if (!decision) return;
    setBusy(true);
    const result = await repository.decideFlight(decision.id, decision.choice, comment, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDecision(null);
    await refreshAfterFlightChange(queryClient);
    notify(`Flight ${decision.choice.toLowerCase()}.`);
  };

  return (
    <>
      <PageHeader
        title="Notifications & Approvals"
        subtitle="Pending flight decisions use the same approval rules as the flight record. Document rows below are links to the register. No other approval type is defined."
      />
      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Flight approvals</Typography>
        {query.data.pending.length === 0 ? <Typography color="text.secondary">No flights are awaiting approval.</Typography> : query.data.pending.map((flight) => (
          <Box key={flight.id} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, p: 2, mb: 1.5 }}>
            <Typography sx={{ fontWeight: 600 }}>{`${flight.reference} · ${nameFor(flight.cadetId)}`}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {`${formatDate(flight.date)} ${flight.start}–${flight.end} · submitted by ${flight.submittedBy || 'demo user'}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
              <Button component={RouterLink} to={`/flight-operations/${flight.id}`} size="small" color="inherit">Open flight</Button>
              {can('flights.approve') ? (
                <>
                  <Button size="small" variant="contained" color="accent" onClick={() => openDecision(flight.id, 'Approved')}>{`Approve ${flight.reference}`}</Button>
                  <Button size="small" color="error" onClick={() => openDecision(flight.id, 'Rejected')}>{`Reject ${flight.reference}`}</Button>
                </>
              ) : null}
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Recorded decisions</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          These are approval notes already stored on the flight. This list does not decide them again.
        </Typography>
        {query.data.decided.length === 0 ? <Typography color="text.secondary">No decisions are recorded.</Typography> : query.data.decided.map((flight) => (
          <Box key={flight.id} sx={{ py: 1, borderBottom: `1px solid ${tokens.line}` }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button component={RouterLink} to={`/flight-operations/${flight.id}`} sx={{ px: 0, textTransform: 'none' }}>{flight.reference}</Button>
              <StatusChip status={flight.status} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {flight.approval ? `${flight.approval.decision} by ${flight.approval.by}: ${flight.approval.comment}` : ''}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
        <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Document reviews</Typography>
        {query.data.pendingDocuments.length === 0 ? <Typography color="text.secondary">No documents are pending review.</Typography> : query.data.pendingDocuments.map((item) => (
          <Typography key={item.id} sx={{ mb: 0.75 }}>
            <RouterLink to="/documents?review=Pending">{item.title}</RouterLink>
          </Typography>
        ))}
      </Box>

      <Dialog open={Boolean(decision)} onClose={() => { if (!busy) setDecision(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{decision ? `${decision.choice} flight` : 'Decide flight'}</DialogTitle>
        <DialogContent>
          {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
          <TextField label="Comment" value={comment} onChange={(event) => setComment(event.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={busy} onClick={() => setDecision(null)}>Cancel</Button>
          <Button variant="contained" color="accent" disabled={busy} onClick={() => { void saveDecision(); }}>{decision?.choice ?? 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
