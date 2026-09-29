import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate, weekday, weekDates } from '../../domain/calculations';
import { DEMO_TODAY } from '../../domain/fixtures';
import type { Flight } from '../../domain/workspace';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { useFlightScheduleQuery } from './flightQueries';
import { FLIGHT_STATUSES, filterScheduleFlights, flightDate, flightView } from './flightRules';

export function FlightSchedulePage() {
  const query = useFlightScheduleQuery();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = flightView(params.get('view'));
  const date = flightDate(params.get('date'));
  const status = params.get('status') ?? '';
  const aircraftId = params.get('aircraft') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Flight Operations" subtitle="Loading the flight register." />
        <CircularProgress aria-label="Loading flights" sx={{ color: 'primary.main' }} />
      </>
    );
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Flight Operations" subtitle="The flight register could not be read." />
        <EmptyState
          title="The flight register did not load"
          body="The demonstration records could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      </>
    );
  }

  const { flights, labels, staff, aircraft, academy } = query.data;
  const dates = weekDates(date);
  const visible = filterScheduleFlights(flights, { status, aircraftId, dates, view, date });
  const nameOf = (id: string) => labels.find((label) => label.id === id)?.name ?? 'Unknown cadet';
  const staffName = (id: string) => staff.find((member) => member.id === id)?.name ?? '';
  const aircraftCode = (id: string) => aircraft.find((item) => item.id === id)?.code ?? '';
  const emptyTitle = flights.length > 0 ? 'No flights in this view' : 'No flights are in this workspace';

  return (
    <>
      <PageHeader
        title="Flight Operations"
        subtitle={`${academy.branchName} · ${academy.timeZone}. Demo day is ${formatDate(DEMO_TODAY)}. Planning constraints are not a flight release or an airworthiness decision.`}
        actions={can('flights.create') ? (
          <Button component={RouterLink} to={`/flight-operations/new?date=${date}`} variant="contained" color="accent">
            Schedule flight
          </Button>
        ) : null}
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2, alignItems: 'center' }}>
        {(['week', 'day', 'agenda'] as const).map((item) => (
          <Button
            key={item}
            size="small"
            variant={view === item ? 'contained' : 'outlined'}
            color={view === item ? 'accent' : 'inherit'}
            onClick={() => setFilter('view', item === 'week' ? '' : item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
        <TextField
          type="date"
          label="Calendar date"
          value={date}
          onChange={(event) => setFilter('date', event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <AppSelect label="Status" value={status} onChange={(value) => setFilter('status', value)} sx={{ minWidth: 180 }} options={[{ value: '', label: 'All statuses' }, ...FLIGHT_STATUSES.map((item) => ({ value: item, label: item }))]} />
        <AppSelect label="Aircraft" value={aircraftId} onChange={(value) => setFilter('aircraft', value)} sx={{ minWidth: 180 }} options={[{ value: '', label: 'All aircraft' }, ...aircraft.map((item) => ({ value: item.id, label: item.code }))]} />
      </Box>
      {visible.length === 0 ? (
        <EmptyState title={emptyTitle} body={flights.length > 0 ? 'Try another date, status, or aircraft.' : 'Scheduled flights will appear in this register.'} />
      ) : view === 'week' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(148px, 1fr))', gap: 1, overflowX: 'auto' }}>
          {dates.map((day) => {
            const dayFlights = visible.filter((flight) => flight.date === day);
            return (
              <Box key={day} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, bgcolor: tokens.surface, minHeight: 180 }}>
                <Box sx={{ px: 1.25, py: 1, borderBottom: `1px solid ${tokens.line}`, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{weekday(day)} {day.slice(8)}</Typography>
                  {can('flights.create') ? (
                    <Button component={RouterLink} to={`/flight-operations/new?date=${day}`} size="small" sx={{ minWidth: 0, px: 0.5 }}>Add</Button>
                  ) : null}
                </Box>
                <Box sx={{ display: 'grid', gap: 0.75, p: 1 }}>
                  {dayFlights.length === 0 ? <Typography variant="body2" color="text.secondary">No flights</Typography> : dayFlights.map((flight) => (
                    <FlightChip key={flight.id} flight={flight} cadetName={nameOf(flight.cadetId)} aircraftCode={aircraftCode(flight.aircraftId)} instructor={staffName(flight.instructorId).split(' ')[0] ?? ''} />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { textAlign: 'left', p: 1.25, borderBottom: `1px solid ${tokens.line}`, fontSize: 14 } }}>
            <thead>
              <tr>
                <th>When</th>
                <th>Reference</th>
                <th>Cadet</th>
                <th>Instructor</th>
                <th>Aircraft</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((flight) => (
                <tr key={flight.id}>
                  <td>{`${formatDate(flight.date)} ${flight.start}`}</td>
                  <td><RouterLink to={`/flight-operations/${flight.id}`}>{flight.reference}</RouterLink></td>
                  <td>{nameOf(flight.cadetId)}</td>
                  <td>{staffName(flight.instructorId)}</td>
                  <td>{aircraftCode(flight.aircraftId)}</td>
                  <td>{flight.flightType}</td>
                  <td><StatusChip status={flight.status} /></td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </>
  );
}

function FlightChip({
  flight,
  cadetName,
  aircraftCode,
  instructor,
}: {
  flight: Flight;
  cadetName: string;
  aircraftCode: string;
  instructor: string;
}) {
  return (
    <Box
      component={RouterLink}
      to={`/flight-operations/${flight.id}`}
      sx={{
        display: 'block',
        p: 1,
        borderRadius: 1.5,
        bgcolor: tokens.page,
        color: 'inherit',
        textDecoration: 'none',
        '&:hover': { outline: `1px solid ${tokens.line}` },
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{flight.start} {cadetName}</Typography>
      <Typography variant="body2" color="text.secondary">{flight.reference}</Typography>
      <Typography variant="body2" color="text.secondary">{`${aircraftCode} · ${instructor}`}</Typography>
      <StatusChip status={flight.status} />
    </Box>
  );
}
