import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '../../components/data/EmptyState';
import { PageHeader } from '../../components/data/PageHeader';
import { useSnackbar } from '../../components/feedback/snackbar';
import { queryKeys } from '../../services/queryClient';
import { useAcademyQuery, useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { formPanelSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';

export function SettingsPage() {
  const query = useAcademyQuery();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const { user } = useAuth();
  const [draft, setDraft] = useState<{ name: string; currency: string; timeZone: string } | null>(null);
  const [error, setError] = useState('');
  const name = draft?.name ?? query.data?.name ?? '';
  const currency = draft?.currency ?? query.data?.currency ?? '';
  const timeZone = draft?.timeZone ?? query.data?.timeZone ?? '';

  const edit = (patch: Partial<{ name: string; currency: string; timeZone: string }>) => {
    setDraft({ name, currency, timeZone, ...patch });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const result = await repository.saveAcademySettings({ name, currency, timeZone }, user ?? undefined);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setDraft(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.academy });
    await queryClient.invalidateQueries({ queryKey: ['audit'] });
    notify('Settings saved in this browser.');
  };

  return (
    <>
      <PageHeader
        title="Academy Settings"
        subtitle="These values apply to later demo records in this browser. Historical records keep the values they were saved with."
      />
      {query.isLoading ? <CircularProgress aria-label="Loading academy profile" sx={{ color: 'primary.main' }} /> : null}
      {query.isError ? (
        <EmptyState
          title="The academy profile did not load"
          body="The demonstration profile could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      ) : null}
      {query.data ? (
        <Box component="form" noValidate onSubmit={(event) => { void save(event); }} sx={{ ...formPanelSx, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>Academy profile</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 160px 200px' }, gap: 2 }}>
            <TextField label="Academy name" value={name} onChange={(event) => edit({ name: event.target.value })} required />
            <TextField label="Currency" value={currency} onChange={(event) => edit({ currency: event.target.value })} />
            <TextField label="Time zone" value={timeZone} onChange={(event) => edit({ timeZone: event.target.value })} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Branch: {query.data.branchName}. Additional branches are not part of this single-base demo. Country ({query.data.country}) and mode ({query.data.mode}) stay as stored. There is no workflow builder and no tenant switch.
          </Typography>
          {error ? <Typography color="error" sx={{ mt: 1 }}>{error}</Typography> : null}
          <Button type="submit" variant="contained" color="accent" sx={{ mt: 2 }}>Save settings</Button>
        </Box>
      ) : null}
    </>
  );
}
