import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';
import { KpiCard } from '../../components/data/KpiCard';
import { SummaryGrid } from '../../components/data/SummaryGrid';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { tokens } from '../../theme/tokens';
import { ACADEMY } from '../../domain/demoData';
import { formatDate, inr } from '../../domain/calculations';
import { DEMO_TODAY } from '../../domain/fixtures';
import { useAcademyQuery, useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { useAuth } from '../auth/AuthProvider';
import { useDashboardQuery } from './dashboardQueries';

const indicators = ['Active', 'On Hold', 'Awaiting approval', 'Draft', 'Maintenance', 'Release recorded'];

export function DashboardPage() {
  const { can } = useAuth();
  const repository = useWorkspaceRepository();
  const academyQuery = useAcademyQuery();
  const dashboard = useDashboardQuery();
  const academy = academyQuery.data ?? ACADEMY;
  const summary = dashboard.data;
  const flightFigures = summary?.operational === true;
  const fleetCount = useQuery({
    queryKey: ['fleet', 'available-count'],
    enabled: can('fleet.view') && summary?.operational === false,
    queryFn: async () => {
      const aircraft = await repository.listAircraft();
      return aircraft.filter((item) => item.status === 'Available').length;
    },
  });
  const flightsToday = flightFigures && summary ? String(summary.flightsToday) : '—';
  const pending = flightFigures && summary ? String(summary.pendingApprovals) : '—';
  const activeCadets = flightFigures && summary ? String(summary.activeCadets) : '—';
  const aircraftFromFleet = Boolean(summary) && !flightFigures && can('fleet.view');
  const aircraftAvailable = flightFigures && summary
    ? String(summary.availableAircraft)
    : aircraftFromFleet && fleetCount.data !== undefined
      ? String(fleetCount.data)
      : '—';
  const flightHint = dashboard.isError
    ? 'Could not be read'
    : !summary
      ? 'Loading'
      : flightFigures
        ? `Demo day ${formatDate(DEMO_TODAY)}. Cancelled flights are not counted.`
        : 'Not shown for this role';
  const cadetHint = dashboard.isError
    ? 'Could not be read'
    : !summary
      ? 'Loading'
      : flightFigures
        ? 'Cadets whose status is Active.'
        : 'Not shown for this role';
  const aircraftHint = dashboard.isError || fleetCount.isError
    ? 'Could not be read'
    : !summary || (aircraftFromFleet && fleetCount.isLoading)
      ? 'Loading'
      : flightFigures || (aircraftFromFleet && fleetCount.data !== undefined)
        ? 'Planning status Available. Not an airworthiness decision.'
        : 'Not shown for this role';

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${academy.name} at a glance. Active cadets, flights, and aircraft availability come from the workspace. Aircraft available is a planning status, not an airworthiness decision.`}
      />
      <SummaryGrid>
        <KpiCard label="Active cadets" value={activeCadets} hint={cadetHint} />
        <KpiCard label="Flights today" value={flightsToday} hint={flightHint} />
        <KpiCard label="Aircraft available" value={aircraftAvailable} hint={aircraftHint} />
        <KpiCard label="Pending approvals" value={pending} hint={flightFigures ? 'Flights awaiting approval.' : flightHint} />
        {can('finance.view') && flightFigures && summary ? (
          <KpiCard label="Outstanding fees" value={inr(summary.outstandingFees)} hint="Illustrative accounts. Not an accounting ledger." />
        ) : null}
      </SummaryGrid>
      <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: 2.5 }}>
        <Box component="h2" sx={{ m: 0, mb: 0.5, fontSize: '1.05rem', color: tokens.navy }}>
          Status labels
        </Box>
        <Box component="p" sx={{ m: 0, mb: 2, color: 'text.secondary', fontSize: 14 }}>
          These labels describe records. A maintenance or release label is a planning note, not a decision that an aircraft is fit to fly.
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {indicators.map((status) => <StatusChip key={status} status={status} />)}
        </Box>
      </Box>
    </>
  );
}
