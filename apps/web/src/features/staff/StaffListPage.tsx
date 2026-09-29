import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { PageHeader } from '../../components/data/PageHeader';
import { RecordGrid } from '../../components/data/RecordGrid';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate } from '../../domain/calculations';
import { qualificationBeforeDemoDay } from './staffRules';
import { useStaffListQuery } from './staffQueries';

type StaffRow = {
  id: string;
  code: string;
  name: string;
  role: string;
  availability: string;
  qualification: string;
  warning: string;
};

export function StaffListPage() {
  const query = useStaffListQuery();
  const rows: StaffRow[] = (query.data ?? []).map((person) => {
    const expires = person.qualifications[0]?.expires ?? '';
    return {
      id: person.id,
      code: person.code,
      name: person.name,
      role: person.role,
      availability: person.availability,
      qualification: formatDate(expires),
      warning: qualificationBeforeDemoDay(expires) ? 'Before the demo day. Informational only.' : '',
    };
  });

  const columns: GridColDef<StaffRow>[] = [
    { field: 'code', headerName: 'Staff ID', flex: 0.7, minWidth: 130 },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 160,
      renderCell: (cell) => (
        <Button component={RouterLink} to={`/hr/${cell.row.id}`} sx={{ justifyContent: 'flex-start', px: 0, textTransform: 'none' }}>
          {cell.row.name}
        </Button>
      ),
    },
    { field: 'role', headerName: 'Role', flex: 1, minWidth: 160 },
    {
      field: 'availability',
      headerName: 'Availability',
      flex: 0.7,
      minWidth: 130,
      renderCell: (cell) => <StatusChip status={cell.row.availability} />,
    },
    {
      field: 'qualification',
      headerName: 'Qualification date',
      flex: 1,
      minWidth: 180,
      renderCell: (cell) => (
        <Box>
          <Typography variant="body2">{cell.row.qualification}</Typography>
          {cell.row.warning ? <Typography variant="caption" color="warning.main">{cell.row.warning}</Typography> : null}
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="HR & Staff"
        subtitle="Staff profiles and availability blocks. Qualification labels are fictional and are not authorisations."
      />
      {query.isLoading ? <CircularProgress aria-label="Loading staff" sx={{ color: 'primary.main' }} /> : null}
      {query.isError ? (
        <EmptyState
          title="The staff register did not load"
          body="The demonstration staff records could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      ) : null}
      {query.isSuccess ? (
        <RecordGrid
          rows={rows}
          columns={columns}
          emptyTitle="No staff are in this workspace"
          emptyBody="Staff records will appear here when the workspace has them."
        />
      ) : null}
    </>
  );
}
