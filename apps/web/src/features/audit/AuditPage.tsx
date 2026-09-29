import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { tokens } from '../../theme/tokens';
import { auditWhen, filterAudit, isSeedAudit } from './auditRules';
import { useAuditQuery } from './auditQueries';

export function AuditPage() {
  const query = useAuditQuery();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const action = params.get('action') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  if (query.isLoading) return <CircularProgress aria-label="Loading audit" sx={{ color: 'primary.main' }} />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="The audit history did not load"
        body="The stored events could not be read. You can try again."
        action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
      />
    );
  }

  const events = filterAudit(query.data, search, action);
  const actions = [...new Set(query.data.map((event) => event.action))];

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Events written when a supported action runs, plus the two seed events. This browser list is not tamper-proof and is not a compliance record."
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <TextField label="Search" value={search} onChange={(event) => setFilter('q', event.target.value)} placeholder="Actor, action, or summary" sx={{ minWidth: 240 }} />
        <AppSelect label="Action" value={action} onChange={(value) => setFilter('action', value)} sx={{ minWidth: 200 }} options={[{ value: '', label: 'All actions' }, ...actions.map((item) => ({ value: item, label: item }))]} />
      </Box>
      {events.length === 0 ? (
        <EmptyState
          title={query.data.length === 0 ? 'No audit events are stored.' : 'No events match these filters.'}
          body="Only actions the workspace already records appear here."
        />
      ) : (
        <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, overflowX: 'auto', bgcolor: tokens.surface }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { textAlign: 'left', p: 1.25, borderBottom: `1px solid ${tokens.line}`, verticalAlign: 'top', fontSize: 14 } }}>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{auditWhen(event.at)}</td>
                  <td>
                    {event.actor}
                    <Typography variant="body2" color="text.secondary">{event.role}</Typography>
                  </td>
                  <td>{event.action}</td>
                  <td>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{event.summary}</span>
                      <Chip size="small" label={isSeedAudit(event) ? 'Seed' : 'Recorded'} />
                    </Box>
                    {event.reason ? <Typography variant="body2" color="text.secondary">{event.reason}</Typography> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </>
  );
}
