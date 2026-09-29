import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
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
import { refreshAfterFuelChange, useFuelQuery } from './fuelQueries';
import { FUEL_TRANSACTION_TYPES, isLowStock } from './fuelRules';

export function FuelPage() {
  const query = useFuelQuery();
  const { can, user } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [tankId, setTankId] = useState('');
  const [type, setType] = useState<string>(FUEL_TRANSACTION_TYPES[0]);
  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (query.isLoading) return <CircularProgress aria-label="Loading fuel" sx={{ color: 'primary.main' }} />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Fuel records did not load"
        body="The demonstration tanks and transactions could not be read. You can try again."
        action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
      />
    );
  }

  const { tanks, transactions, balances } = query.data;
  const selectedTank = tankId || tanks[0]?.id || '';

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await repository.addFuelTransaction({
      tankId: selectedTank,
      type,
      quantity,
      reference,
      reason,
    }, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setQuantity('');
    setReference('');
    setReason('');
    await refreshAfterFuelChange(queryClient);
    notify('Stock balance updated.');
  };

  return (
    <>
      <PageHeader
        title="Fuel"
        subtitle="Calculated stock from receipts, issues, and adjustments. No unit conversion is applied."
      />
      {tanks.length === 0 ? (
        <EmptyState title="No tanks are in this workspace" body="Fuel stock will appear here when the workspace has a tank." />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 2, mb: 2 }}>
          {tanks.map((tank) => {
            const balance = balances[tank.id] ?? 0;
            const low = isLowStock(balance, tank.threshold);
            return (
              <Box key={tank.id} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: 2.5 }}>
                <Typography component="h2" sx={{ m: 0, fontSize: '1rem', color: tokens.navy }}>{tank.name}</Typography>
                <Typography sx={{ mt: 1, fontSize: '1.75rem', fontWeight: 600, color: tokens.navy }}>{`${balance} ${tank.unit}`}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {`${tank.fuelType} · threshold ${tank.threshold} ${tank.unit}`}
                </Typography>
                {low ? <Box sx={{ mt: 1 }}><StatusChip status="Low stock" /></Box> : null}
              </Box>
            );
          })}
        </Box>
      )}

      {can('fuel.manage') && tanks.length > 0 ? (
        <Box component="form" noValidate onSubmit={(event) => { void save(event); }} sx={{ ...formPanelSx, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
          <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Record transaction</Typography>
          {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
            <AppSelect label="Tank" value={selectedTank} onChange={setTankId} options={tanks.map((tank) => ({ value: tank.id, label: tank.name }))} />
            <AppSelect label="Type" value={type} onChange={setType} options={FUEL_TRANSACTION_TYPES.map((item) => ({ value: item, label: item }))} />
            <TextField type="number" label="Quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} slotProps={{ htmlInput: { step: 0.1 } }} />
            <TextField label="Reference" value={reference} onChange={(event) => setReference(event.target.value)} />
            <TextField label="Reason" placeholder="Required for an adjustment" value={reason} onChange={(event) => setReason(event.target.value)} sx={{ gridColumn: { md: 'span 2' } }} />
          </Box>
          <Button type="submit" variant="contained" color="accent" disabled={busy} sx={{ mt: 1.5 }}>Save transaction</Button>
        </Box>
      ) : null}

      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { textAlign: 'left', p: 1.25, borderBottom: `1px solid ${tokens.line}`, fontSize: 14 } }}>
          <thead>
            <tr>
              <th>When</th>
              <th>Tank</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={5}>No fuel transactions are recorded.</td></tr>
            ) : transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{formatDate(tx.at)}</td>
                <td>{tanks.find((tank) => tank.id === tx.tankId)?.name ?? ''}</td>
                <td>{tx.type}</td>
                <td>{tx.quantity}</td>
                <td>{tx.reference}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </>
  );
}
