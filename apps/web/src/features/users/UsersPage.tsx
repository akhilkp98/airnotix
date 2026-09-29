import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { useSnackbar } from '../../components/feedback/snackbar';
import { DEMO_PASSWORD } from '../../domain/demoData';
import { ROLE_LABELS, ROLE_PERMISSIONS, type RoleId } from '../../domain/permissions';
import { queryKeys } from '../../services/queryClient';
import { useDemoUsersQuery, useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { formPanelSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';

const ROLES = Object.keys(ROLE_LABELS) as RoleId[];

export function UsersPage() {
  const query = useDemoUsersQuery();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const { user, can } = useAuth();
  const [params] = useSearchParams();
  const selected = (params.get('role') || 'academy-admin') as RoleId;
  const roleLabel = ROLE_LABELS[selected] || selected;
  const permissions = ROLE_PERMISSIONS[selected] ?? [];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleId>('academy-admin');
  const [error, setError] = useState('');

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const result = await repository.addUser({ name, email, role }, user ?? undefined);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName('');
    setEmail('');
    setError('');
    await queryClient.invalidateQueries({ queryKey: queryKeys.demoUsers });
    await queryClient.invalidateQueries({ queryKey: ['audit'] });
    notify('Demo user added.');
  };

  return (
    <>
      <PageHeader
        title="Users & Roles"
        subtitle="Demonstration accounts stored in this workspace. Adding a row does not send an invitation, store a password, or provision a production account."
      />
      {query.isLoading ? <CircularProgress aria-label="Loading demonstration accounts" sx={{ color: 'primary.main' }} /> : null}
      {query.isError ? (
        <EmptyState
          title="The account list did not load"
          body="The demonstration directory could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      ) : null}
      {query.isSuccess && query.data.length === 0 ? (
        <EmptyState title="No demonstration accounts" body="The sample directory is empty." />
      ) : null}
      {query.data && query.data.length > 0 ? (
        <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, overflowX: 'auto', bgcolor: tokens.surface, mb: 2 }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { textAlign: 'left', p: 1.25, borderBottom: `1px solid ${tokens.line}`, fontSize: 14 } }}>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Account</th></tr>
            </thead>
            <tbody>
              {query.data.map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{account.email}</td>
                  <td>
                    <Button component={RouterLink} to={`/users?role=${account.role}`} size="small" color="inherit">
                      {ROLE_LABELS[account.role]}
                    </Button>
                  </td>
                  <td>Demonstration</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      ) : null}
      {query.isSuccess ? (
        <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>{roleLabel} permissions</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Frontend checks only. A production API must enforce the same rules.</Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            {permissions.map((item) => <li key={item}><code>{item}</code></li>)}
          </Box>
        </Box>
      ) : null}
      {can('users.manage') ? (
        <Box component="form" noValidate onSubmit={(event) => { void add(event); }} sx={{ ...formPanelSx, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
          <Typography sx={{ fontWeight: 600 }}>Add demo user</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            The shared demo password remains “{DEMO_PASSWORD}”. It is not saved on the user. Existing roles are not edited, so this form cannot remove the current administrator.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
            <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
            <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <AppSelect label="Role" value={role} onChange={setRole} options={ROLES.map((id) => ({ value: id, label: ROLE_LABELS[id] }))} />
          </Box>
          {error ? <Typography color="error" sx={{ mt: 1 }}>{error}</Typography> : null}
          <Button type="submit" variant="contained" color="accent" sx={{ mt: 2 }}>Add user</Button>
        </Box>
      ) : null}
    </>
  );
}
