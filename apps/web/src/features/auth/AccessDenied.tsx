import { Link as RouterLink } from 'react-router';
import Button from '@mui/material/Button';
import { useAuth } from './AuthProvider';
import { EmptyState } from '../../components/data/EmptyState';
import { PageHeader } from '../../components/data/PageHeader';

export function AccessDenied() {
  const { user, homePath } = useAuth();
  const name = user?.name ?? 'This account';

  return (
    <div data-testid="access-denied">
      <PageHeader
        title="Access limited"
        subtitle="This demonstration account cannot open the requested page."
      />
      <EmptyState
        title="You do not have access to this page"
        body={`${name} can use the pages shown in the navigation. Opening another module directly stays closed until a role with that permission is selected.`}
        action={(
          <Button component={RouterLink} to={homePath} variant="contained" color="accent">
            Back to your workspace
          </Button>
        )}
      />
    </div>
  );
}
