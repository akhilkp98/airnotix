import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { RecordGrid } from '../../components/data/RecordGrid';
import { StatusChip } from '../../components/data/StatusChip';
import { recordedAircraftHours } from '../../domain/calculations';
import type { Flight, WorkspaceState } from '../../domain/workspace';
import { AIRCRAFT_STATUSES, filterAircraft, upcomingBookings } from './fleetRules';
import { useFleetListQuery } from './fleetQueries';

type AircraftRow = {
  id: string;
  code: string;
  type: string;
  status: string;
  hours: number;
  threshold: number;
  bookings: number;
};

export function FleetListPage() {
  const query = useFleetListQuery();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const status = params.get('status') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const loaded = query.data;
  const visible = loaded ? filterAircraft(loaded.aircraft, search, status) : [];
  const rows: AircraftRow[] = loaded
    ? visible.map((aircraft) => {
      const state = { aircraft: loaded.aircraft, flights: loaded.flights } as WorkspaceState;
      return {
        id: aircraft.id,
        code: aircraft.code,
        type: aircraft.type,
        status: aircraft.status,
        hours: recordedAircraftHours(state, aircraft.id),
        threshold: aircraft.nextMaintenanceHours,
        bookings: upcomingBookings(loaded.flights as Flight[], aircraft.id),
      };
    })
    : [];

  const columns: GridColDef<AircraftRow>[] = [
    {
      field: 'code',
      headerName: 'Identifier',
      flex: 0.9,
      minWidth: 140,
      renderCell: (cell) => (
        <Button component={RouterLink} to={`/fleet/${cell.row.id}`} sx={{ justifyContent: 'flex-start', px: 0, textTransform: 'none' }}>
          {cell.row.code}
        </Button>
      ),
    },
    { field: 'type', headerName: 'Type', flex: 1.2, minWidth: 180 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.7,
      minWidth: 130,
      renderCell: (cell) => <StatusChip status={cell.row.status} />,
    },
    { field: 'hours', headerName: 'Recorded hours', flex: 0.7, minWidth: 130 },
    { field: 'threshold', headerName: 'Next threshold', flex: 0.7, minWidth: 140 },
    { field: 'bookings', headerName: 'Bookings', flex: 0.5, minWidth: 110 },
  ];

  const emptyTitle = loaded && loaded.aircraft.length > 0 ? 'No aircraft match these filters' : 'No aircraft are in this workspace';

  return (
    <>
      <PageHeader
        title="Fleet"
        subtitle="Planning records for the demonstration aircraft. A status here is not an airworthiness or release decision."
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <TextField
          label="Search aircraft"
          placeholder="Identifier or type"
          value={search}
          onChange={(event) => setFilter('q', event.target.value)}
          sx={{ flex: '1 1 220px' }}
        />
        <AppSelect
          label="Status"
          value={status}
          onChange={(value) => setFilter('status', value)}
          sx={{ minWidth: 180 }}
          options={[{ value: '', label: 'All statuses' }, ...AIRCRAFT_STATUSES.map((item) => ({ value: item, label: item }))]}
        />
      </Box>
      {query.isLoading ? <CircularProgress aria-label="Loading aircraft" sx={{ color: 'primary.main' }} /> : null}
      {query.isError ? (
        <EmptyState
          title="The fleet register did not load"
          body="The demonstration aircraft could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      ) : null}
      {query.isSuccess ? (
        <>
          <RecordGrid
            rows={rows}
            columns={columns}
            emptyTitle={emptyTitle}
            emptyBody={loaded && loaded.aircraft.length > 0
              ? 'Try another identifier, type, or status.'
              : 'Aircraft records will appear here when the workspace has them.'}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Identifiers are fictional. Hours are the opening balance plus completed demo flights. The next threshold is a configured number, not a maintenance programme.
          </Typography>
        </>
      ) : null}
    </>
  );
}
