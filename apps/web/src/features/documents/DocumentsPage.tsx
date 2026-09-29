import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { useSnackbar } from '../../components/feedback/snackbar';
import { formatDate } from '../../domain/calculations';
import type { AcademyDocument } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { refreshAfterDocumentReview, useDocumentsQuery } from './documentQueries';
import { DOCUMENT_REVIEW_FILTERS, filterDocuments } from './documentRules';

export function DocumentsPage() {
  const query = useDocumentsQuery();
  const { can, user } = useAuth();
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const review = params.get('review') ?? '';
  const search = params.get('q') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  if (query.isLoading) return <CircularProgress aria-label="Loading documents" sx={{ color: 'primary.main' }} />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="The document register did not load"
        body="The demonstration register could not be read. You can try again."
        action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
      />
    );
  }

  const rows = filterDocuments(query.data.documents, review, search);

  const reviewDocument = async (id: string, next: string) => {
    const result = await repository.reviewDocument(id, next, user ?? undefined);
    if (!result.ok) {
      notify(result.error);
      return;
    }
    await refreshAfterDocumentReview(queryClient);
    notify('Review updated.');
  };

  return (
    <>
      <PageHeader
        title="Documents & Compliance"
        subtitle="Register rows already stored in the workspace. A review label is not a check that a file is authentic, and no file is stored for download."
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {DOCUMENT_REVIEW_FILTERS.map((item) => (
          <Button
            key={item.label}
            size="small"
            variant={review === item.value ? 'contained' : 'outlined'}
            color={review === item.value ? 'accent' : 'inherit'}
            onClick={() => setFilter('review', item.value)}
          >
            {item.label}
          </Button>
        ))}
        <TextField label="Search documents" placeholder="Title or category" value={search} onChange={(event) => setFilter('q', event.target.value)} sx={{ flex: '1 1 220px', ml: { md: 1 } }} />
      </Box>
      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { textAlign: 'left', p: 1.25, borderBottom: `1px solid ${tokens.line}`, fontSize: 14, verticalAlign: 'top' } }}>
          <thead>
            <tr><th>Title</th><th>Owner</th><th>Uploaded</th><th>Expiry</th><th>Review</th><th></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6}>{query.data.documents.length === 0 ? 'No documents are in this workspace.' : 'No documents in this filter.'}</td></tr>
            ) : rows.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.title}
                  <Box component="div" sx={{ color: 'text.secondary', fontSize: 12 }}>{`${item.category} · preview placeholder`}</Box>
                </td>
                <td><OwnerLink document={item} data={query.data} can={can} /></td>
                <td>{formatDate(item.uploaded)}</td>
                <td>{item.expires ? formatDate(item.expires) : '—'}</td>
                <td><StatusChip status={item.review} /></td>
                <td>
                  {can('documents.review') && item.review === 'Pending' ? (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button size="small" color="inherit" onClick={() => { void reviewDocument(item.id, 'Accepted'); }}>{`Accept ${item.title}`}</Button>
                      <Button size="small" color="error" onClick={() => { void reviewDocument(item.id, 'Rejected'); }}>{`Reject ${item.title}`}</Button>
                    </Box>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        Files are not stored in this browser. There is no download, and no upload or metadata edit is defined for this register.
      </Typography>
    </>
  );
}

function OwnerLink({
  document,
  data,
  can,
}: {
  document: AcademyDocument;
  data: NonNullable<ReturnType<typeof useDocumentsQuery>['data']>;
  can: (permission: 'cadets.view' | 'fleet.view' | 'staff.view') => boolean;
}) {
  if (document.ownerType === 'Cadet') {
    const name = data.cadets.find((item) => item.id === document.ownerId)?.name ?? '';
    return can('cadets.view') ? <RouterLink to={`/cadets/${document.ownerId}`}>{name}</RouterLink> : <>{name}</>;
  }
  if (document.ownerType === 'Aircraft') {
    const code = data.aircraft.find((item) => item.id === document.ownerId)?.code ?? '';
    return can('fleet.view') ? <RouterLink to={`/fleet/${document.ownerId}`}>{code}</RouterLink> : <>{code}</>;
  }
  if (document.ownerType === 'Staff') {
    const name = data.staff.find((item) => item.id === document.ownerId)?.name ?? '';
    return can('staff.view') ? <RouterLink to={`/hr/${document.ownerId}`}>{name}</RouterLink> : <>{name}</>;
  }
  if (document.ownerType === 'Course') {
    return <>{data.courses.find((item) => item.id === document.ownerId)?.name ?? document.ownerType}</>;
  }
  return <>{document.ownerType}</>;
}
