import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { StatusChip } from '../../components/data/StatusChip';
import { useSnackbar } from '../../components/feedback/snackbar';
import { formatDate } from '../../domain/calculations';
import type { Flight } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { refreshAfterFlightChange } from '../flights/flightQueries';
import { EmptyLine } from './dashboardWidgets';

export function PendingApprovals({
  flights,
  cadetName,
}: {
  flights: Flight[];
  cadetName: (id: string) => string;
}) {
  const { can, user } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [decision, setDecision] = useState<{ id: string; choice: 'Approved' | 'Rejected' } | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canDecide = can('flights.approve');

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

  if (flights.length === 0) return <EmptyLine>No flights are awaiting approval.</EmptyLine>;

  return (
    <>
      {flights.map((flight) => (
        <Box key={flight.id} sx={{ py: 1.25, borderTop: `1px solid ${tokens.line}`, '&:first-of-type': { borderTop: 0 } }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button component={RouterLink} to={`/flight-operations/${flight.id}`} sx={{ px: 0, minWidth: 0, textTransform: 'none' }}>
              {flight.reference}
            </Button>
            <StatusChip status={flight.status} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {`${formatDate(flight.date)} ${flight.start}–${flight.end} · ${cadetName(flight.cadetId)} · submitted by ${flight.submittedBy || 'demo user'}`}
          </Typography>
          {canDecide ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              <Button size="small" variant="contained" color="accent" onClick={() => openDecision(flight.id, 'Approved')}>{`Approve ${flight.reference}`}</Button>
              <Button size="small" color="error" onClick={() => openDecision(flight.id, 'Rejected')}>{`Reject ${flight.reference}`}</Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Read only. This role can open the flight and cannot decide it.
            </Typography>
          )}
        </Box>
      ))}
      <Dialog open={Boolean(decision)} onClose={() => { if (!busy) setDecision(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{decision ? `${decision.choice} flight` : 'Decide flight'}</DialogTitle>
        <DialogContent>
          {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
          <TextField label="Comment" value={comment} onChange={(event) => setComment(event.target.value)} fullWidth required />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={busy} onClick={() => setDecision(null)}>Cancel</Button>
          <Button variant="contained" color="accent" disabled={busy} onClick={() => { void saveDecision(); }}>{decision?.choice ?? 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
