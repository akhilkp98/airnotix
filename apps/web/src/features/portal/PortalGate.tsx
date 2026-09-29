import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { EmptyState } from '../../components/data/EmptyState';
import type { PortalSnapshot } from '../../domain/workspace';
import { usePortalQuery } from './portalQueries';

export function PortalGate({ children }: { children: (home: PortalSnapshot) => ReactNode }) {
  const query = usePortalQuery();
  if (query.isLoading) return <CircularProgress aria-label="Loading your portal" sx={{ color: 'primary.main' }} />;
  if (query.isError) {
    return (
      <EmptyState
        title="Your portal records did not load"
        body="The workspace could not be read. You can try again."
        action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
      />
    );
  }
  if (!query.data) {
    return (
      <EmptyState
        title="No cadet profile is linked."
        body="This portal is the cadet experience. Use the profile menu and choose Aarav Menon."
      />
    );
  }
  return children(query.data);
}
