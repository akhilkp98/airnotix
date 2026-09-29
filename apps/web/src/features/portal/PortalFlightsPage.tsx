import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate } from '../../domain/calculations';
import type { PortalFlight } from '../../domain/workspace';
import { detailGridSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { PortalGate } from './PortalGate';
import { completedFlights, earlierApprovedFlights, upcomingFlights } from './portalRules';

export function PortalFlightsPage() {
  return (
    <PortalGate>
      {(home) => (
        <>
          <PageHeader
            title="My Flights"
            subtitle="Approved and completed flights on your record. Drafts, other cadets, and internal notes are not shown. This page does not approve, reschedule, or complete a flight."
          />
          <FlightGroup title="Upcoming" flights={upcomingFlights(home.flights)} empty="No approved flight is scheduled." />
          <FlightGroup title="Earlier approved flights" flights={earlierApprovedFlights(home.flights)} empty="No earlier approved flight is on your record." />
          <FlightGroup title="Flight history" flights={completedFlights(home.flights)} empty="No completed flight is on your record." />
        </>
      )}
    </PortalGate>
  );
}

export function PortalFlightPage() {
  const { flightId = '' } = useParams();
  return (
    <PortalGate>
      {(home) => {
        const flight = home.flights.find((item) => item.id === flightId);
        if (!flight) {
          return (
            <EmptyState
              title="This flight is not on your schedule."
              body="Only your approved and completed flights can be opened here."
            />
          );
        }
        const rows: Array<[string, string]> = [
          ['Date', formatDate(flight.date)],
          ['Time', `${flight.start}–${flight.end}`],
          ['Aircraft', flight.aircraftCode],
          ['Instructor', flight.instructorName],
          ['Status', flight.status],
        ];
        if (flight.hours !== null) rows.push(['Recorded hours', String(flight.hours)]);
        return (
          <>
            <PageHeader title={flight.reference} subtitle="Your flight record. Approval, completion, and scheduling stay with the academy." />
            <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
              <StatusChip status={flight.status} />
              <Box sx={{ ...detailGridSx, mt: 2 }}>
                {rows.map(([label, value]) => (
                  <Box key={label} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        );
      }}
    </PortalGate>
  );
}

function FlightGroup({ title, flights, empty }: { title: string; flights: PortalFlight[]; empty: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography component="h2" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
      {flights.length === 0 ? <Typography color="text.secondary">{empty}</Typography> : (
        <Box sx={{ display: 'grid', gap: 1 }}>
          {flights.map((flight) => (
            <Box key={flight.id} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, bgcolor: tokens.surface, p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 600 }}>{flight.reference}</Typography>
                <StatusChip status={flight.status} />
              </Box>
              <Typography variant="body2">{formatDate(flight.date)} {flight.start}–{flight.end}</Typography>
              <Typography variant="body2" color="text.secondary">{flight.aircraftCode} · {flight.instructorName}{flight.hours !== null ? ` · ${flight.hours} h` : ''}</Typography>
              <RouterLink to={`/portal/schedule/${flight.id}`}>Open flight</RouterLink>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
