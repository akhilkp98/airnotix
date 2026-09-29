import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { KpiCard } from '../../components/data/KpiCard';
import { SummaryGrid } from '../../components/data/SummaryGrid';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { useSnackbar } from '../../components/feedback/snackbar';
import { formatDate, inr } from '../../domain/calculations';
import { DEMO_TODAY } from '../../domain/fixtures';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { formPanelSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { refreshAfterFinanceChange, useFinanceQuery } from './financeQueries';
import { filterFeeAccounts } from './financeRules';

export function FinancePage() {
  const query = useFinanceQuery();
  const { can, user } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const overdueOnly = params.get('overdue') === '1';
  const [date, setDate] = useState(DEMO_TODAY);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  if (query.isLoading) return <CircularProgress aria-label="Loading finance" sx={{ color: 'primary.main' }} />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Finance records did not load"
        body="The demonstration accounts could not be read. You can try again."
        action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
      />
    );
  }

  const { snapshot, accounts, expenses } = query.data;
  const visible = filterFeeAccounts(accounts, search, overdueOnly);

  const saveExpense = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await repository.addExpense({ date, category, amount, description }, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setCategory('');
    setAmount('');
    setDescription('');
    await refreshAfterFinanceChange(queryClient);
    notify('Expense recorded.');
  };

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle="Illustrative demo amounts. No payment gateway is connected, and this is not an accounting ledger. A recorded payment is not a confirmed external settlement."
      />
      <SummaryGrid>
        <KpiCard label="Billed" value={inr(snapshot.billed)} />
        <KpiCard label="Collected" value={inr(snapshot.collected)} />
        <KpiCard label="Outstanding" value={inr(snapshot.outstanding)} />
        <KpiCard label="Overdue accounts" value={String(snapshot.overdueAccounts)} />
        <KpiCard label="Expenses" value={inr(snapshot.expenses)} />
      </SummaryGrid>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Outstanding is the course plan total minus that cadet’s payments. Overdue means an outstanding balance and a due date before the demo day. No fee-adjustment action is defined.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <TextField label="Search accounts" placeholder="Name, cadet ID, or plan" value={search} onChange={(event) => setFilter('q', event.target.value)} sx={{ flex: '1 1 220px' }} />
        <AppSelect
          label="Account"
          value={overdueOnly ? 'overdue' : ''}
          onChange={(value) => setFilter('overdue', value === 'overdue' ? '1' : '')}
          sx={{ minWidth: 180 }}
          options={[{ value: '', label: 'All accounts' }, { value: 'overdue', label: 'Overdue' }]}
        />
      </Box>

      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, overflow: 'auto', mb: 2 }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { textAlign: 'left', p: 1.25, borderBottom: `1px solid ${tokens.line}`, fontSize: 14 } }}>
          <thead>
            <tr><th>Cadet</th><th>Plan</th><th>Collected</th><th>Outstanding</th></tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={4}>{accounts.length === 0 ? 'No cadet accounts are in this workspace.' : 'No accounts match these filters.'}</td></tr>
            ) : visible.map((row) => (
              <tr key={row.cadetId}>
                <td>
                  {can('cadets.view') ? <RouterLink to={`/cadets/${row.cadetId}?tab=fees`}>{row.name}</RouterLink> : row.name}
                  <Box component="div" sx={{ color: 'text.secondary', fontSize: 12 }}>{row.code}</Box>
                </td>
                <td>{row.planName}</td>
                <td>{inr(row.paid)}</td>
                <td>
                  {inr(row.outstanding)}
                  {row.overdue ? <Box component="span" sx={{ ml: 1 }}><StatusChip status="Overdue" /></Box> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>

      {can('finance.manage') ? (
        <Box component="form" noValidate onSubmit={(event) => { void saveExpense(event); }} sx={{ ...formPanelSx, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
          <Typography component="h2" sx={{ m: 0, mb: 1.5, fontSize: '1rem', color: tokens.navy }}>Record expense</Typography>
          {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' } }}>
            <TextField type="date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Category" value={category} onChange={(event) => setCategory(event.target.value)} />
            <TextField type="number" label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} slotProps={{ htmlInput: { min: 1 } }} />
            <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </Box>
          <Button type="submit" variant="contained" color="accent" disabled={busy} sx={{ mt: 1.5 }}>Save expense</Button>
        </Box>
      ) : null}

      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { textAlign: 'left', p: 1.25, borderBottom: `1px solid ${tokens.line}`, fontSize: 14 } }}>
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={4}>No expenses are recorded.</td></tr>
            ) : expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{formatDate(expense.date)}</td>
                <td>{expense.category}</td>
                <td>{expense.description}</td>
                <td>{inr(expense.amount)}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </>
  );
}
