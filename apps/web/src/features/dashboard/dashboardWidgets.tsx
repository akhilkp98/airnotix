import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { RefreshCw, type LucideIcon } from 'lucide-react';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate } from '../../domain/calculations';
import { tokens } from '../../theme/tokens';
import type { FlightLine } from './dashboardRules';

const cardRadius = '12px';

const accents = {
  navy: { bar: tokens.navy, soft: tokens.neutralSoft },
  sky: { bar: tokens.sky, soft: tokens.skySoft },
  teal: { bar: tokens.teal, soft: tokens.tealSoft },
  amber: { bar: tokens.warning, soft: tokens.warningSoft },
  rose: { bar: tokens.danger, soft: tokens.dangerSoft },
  lime: { bar: tokens.limeHover, soft: tokens.limeSoft },
} as const;

type MetricTone = keyof typeof accents;

const statusTone: Record<string, string> = {
  Active: tokens.teal,
  Accepted: tokens.teal,
  Approved: tokens.teal,
  Available: tokens.teal,
  Completed: tokens.sky,
  'On Hold': tokens.warning,
  'Awaiting approval': tokens.warning,
  Pending: tokens.warning,
  Restricted: tokens.warning,
  Limited: tokens.warning,
  Open: tokens.warning,
  Maintenance: tokens.danger,
  Overdue: tokens.danger,
  High: tokens.danger,
  Rejected: tokens.danger,
  Draft: tokens.sky,
  'In progress': tokens.info,
};

function toneForStatus(status: string) {
  return statusTone[status] ?? tokens.navy;
}

export function DashboardHeader({
  title,
  subtitle,
  context,
  onRefresh,
  actions,
}: {
  title: string;
  subtitle: string;
  context: string;
  onRefresh: () => void;
  actions: { label: string; to: string; primary?: boolean }[];
}) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={(
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 1, minWidth: 0, maxWidth: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">{context}</Typography>
            <Button size="small" variant="outlined" color="inherit" onClick={onRefresh} startIcon={<RefreshCw size={15} aria-hidden />}>
              Refresh
            </Button>
          </Box>
          <QuickActions actions={actions} />
        </Box>
      )}
    />
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 1.25 }}>
      {children}
    </Box>
  );
}

export function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'navy',
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: MetricTone;
  to?: string;
}) {
  const accent = accents[tone];
  return (
    <Box
      component={to ? RouterLink : 'div'}
      to={to}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        columnGap: 1,
        rowGap: 0.5,
        alignItems: 'start',
        minWidth: 0,
        height: '100%',
        p: 1.75,
        textDecoration: 'none',
        color: 'inherit',
        bgcolor: tokens.surface,
        border: `1px solid ${tokens.line}`,
        borderLeft: `3px solid ${accent.bar}`,
        borderRadius: cardRadius,
        '&:hover': to ? { bgcolor: accent.soft } : undefined,
        '&:focus-visible': { outline: `2px solid ${tokens.navy}`, outlineOffset: 2 },
      }}
    >
      <Typography component="p" sx={{ m: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: accent.soft, color: accent.bar, display: 'grid', placeItems: 'center' }}>
        <Icon size={15} aria-hidden />
      </Box>
      <Typography component="p" sx={{ m: 0, gridColumn: '1 / -1', fontSize: '1.65rem', fontWeight: 600, color: tokens.navy, lineHeight: 1.15, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
      {hint ? <Typography variant="body2" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>{hint}</Typography> : null}
    </Box>
  );
}

export function DashboardColumns({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) minmax(260px, 0.9fr)' }, gap: 1.5, mt: 1.5, alignItems: 'start' }}>
      {children}
    </Box>
  );
}

export function DashboardSection({
  title,
  hint,
  children,
  tone = 'default',
  wide = false,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  tone?: 'default' | 'attention' | 'critical';
  wide?: boolean;
}) {
  const edge = tone === 'critical' ? tokens.danger : tone === 'attention' ? tokens.warning : tokens.line;
  return (
    <Box sx={{
      minWidth: 0,
      border: `1px solid ${tokens.line}`,
      borderLeft: tone === 'default' ? `1px solid ${tokens.line}` : `3px solid ${edge}`,
      borderRadius: cardRadius,
      bgcolor: tokens.surface,
      p: { xs: 1.75, sm: 2.25 },
      gridColumn: wide ? { md: '1 / -1' } : undefined,
    }}>
      <Typography component="h2" sx={{ m: 0, fontSize: '0.95rem', fontWeight: 650, color: tokens.navy }}>{title}</Typography>
      {hint ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>{hint}</Typography> : <Box sx={{ mb: 1.5 }} />}
      {children}
    </Box>
  );
}

export function EmptyLine({ children }: { children: string }) {
  return <Typography color="text.secondary">{children}</Typography>;
}

export function QuickActions({ actions }: { actions: { label: string; to: string; primary?: boolean }[] }) {
  if (actions.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {actions.map((action) => (
        <Button
          key={action.to + action.label}
          component={RouterLink}
          to={action.to}
          variant={action.primary ? 'contained' : 'outlined'}
          color={action.primary ? 'accent' : 'inherit'}
          size="small"
        >
          {action.label}
        </Button>
      ))}
    </Box>
  );
}

export function FlightList({ flights, aircraftHref = false }: { flights: FlightLine[]; aircraftHref?: boolean }) {
  if (flights.length === 0) return <EmptyLine>No flights in this list.</EmptyLine>;
  return (
    <Box>
      {flights.map((flight) => (
        <Box key={flight.id} sx={{ py: 1.1, borderTop: `1px solid ${tokens.line}`, '&:first-of-type': { borderTop: 0 } }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button component={RouterLink} to={`/flight-operations/${flight.id}`} sx={{ px: 0, minWidth: 0, fontWeight: 650, color: tokens.navy }}>
              {flight.reference}
            </Button>
            <StatusChip status={flight.status} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {`${formatDate(flight.date)} ${flight.start}–${flight.end} · ${flight.cadetName} · ${flight.instructorName} · `}
            {aircraftHref ? <RouterLink to={`/fleet/${flight.aircraftId}`}>{flight.aircraftCode}</RouterLink> : flight.aircraftCode}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function ShareBars({
  items,
}: {
  items: { label: string; count: number; href?: string }[];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return <EmptyLine>No records in this summary.</EmptyLine>;
  return (
    <Box>
      <Box sx={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', bgcolor: tokens.neutralSoft, mb: 1.5 }} aria-hidden>
        {items.filter((item) => item.count > 0).map((item) => (
          <Box key={item.label} sx={{ width: `${(item.count / total) * 100}%`, bgcolor: toneForStatus(item.label) }} />
        ))}
      </Box>
      <Box role="img" aria-label={items.map((item) => `${item.label} ${item.count}`).join(', ')}>
        {items.map((item) => {
          const row = (
            <>
              <Typography variant="body2" sx={{ minWidth: 0 }}>{item.label}</Typography>
              <Box sx={{ height: 8, borderRadius: 99, bgcolor: tokens.neutralSoft, overflow: 'hidden' }}>
                <Box sx={{ width: `${(item.count / total) * 100}%`, height: '100%', bgcolor: toneForStatus(item.label) }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.navy }}>{item.count}</Typography>
            </>
          );
          const layout = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(72px, 1.4fr) auto', gap: 1, alignItems: 'center', py: 0.45, color: 'inherit', textDecoration: 'none', '&:focus-visible': { outline: `2px solid ${tokens.navy}`, outlineOffset: 2 } };
          return item.href ? (
            <Box key={item.label} component={RouterLink} to={item.href} sx={layout}>{row}</Box>
          ) : (
            <Box key={item.label} sx={layout}>{row}</Box>
          );
        })}
      </Box>
    </Box>
  );
}

const dayStart = 5 * 60;
const daySpan = 14 * 60;

function minutes(value: string) {
  const [hour, minute] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return dayStart;
  return hour * 60 + minute;
}

export function ScheduleBoard({ flights, aircraftHref = false }: { flights: FlightLine[]; aircraftHref?: boolean }) {
  if (flights.length === 0) return <EmptyLine>No flights in this list.</EmptyLine>;
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        Bar length uses the stored start and end, placed on a 05:00–19:00 scale.
      </Typography>
      {flights.map((flight) => {
        const start = Math.min(Math.max(minutes(flight.start), dayStart), dayStart + daySpan);
        const end = Math.min(Math.max(minutes(flight.end), start), dayStart + daySpan);
        const left = ((start - dayStart) / daySpan) * 100;
        const width = Math.max(((end - start) / daySpan) * 100, 4);
        return (
          <Box key={flight.id} sx={{ py: 1, borderTop: `1px solid ${tokens.line}`, '&:first-of-type': { borderTop: 0 } }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button component={RouterLink} to={`/flight-operations/${flight.id}`} sx={{ px: 0, minWidth: 0, fontWeight: 650, color: tokens.navy }}>
                {flight.reference}
              </Button>
              <StatusChip status={flight.status} />
              <Typography variant="body2" color="text.secondary">{`${flight.start}–${flight.end}`}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {`${flight.cadetName} · ${flight.instructorName} · `}
              {aircraftHref ? <RouterLink to={`/fleet/${flight.aircraftId}`}>{flight.aircraftCode}</RouterLink> : flight.aircraftCode}
            </Typography>
            <Box sx={{ position: 'relative', height: 8, mt: 0.75, borderRadius: 99, bgcolor: tokens.neutralSoft }} aria-hidden>
              <Box sx={{ position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%', borderRadius: 99, bgcolor: toneForStatus(flight.status) }} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export function ProgressList({
  rows,
  empty,
}: {
  rows: { id: string; href: string; name: string; percent: number; detail: string }[];
  empty: string;
}) {
  if (rows.length === 0) return <EmptyLine>{empty}</EmptyLine>;
  return (
    <Box>
      {rows.map((row) => (
        <Box key={row.id} sx={{ py: 1, borderTop: `1px solid ${tokens.line}`, '&:first-of-type': { borderTop: 0 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <RouterLink to={row.href}>{row.name}</RouterLink>
            <Typography variant="body2" color="text.secondary">{row.detail}</Typography>
          </Box>
          <Box sx={{ mt: 0.75, height: 8, borderRadius: 99, bgcolor: tokens.neutralSoft, overflow: 'hidden' }} aria-hidden>
            <Box sx={{ width: `${Math.max(0, Math.min(row.percent, 100))}%`, height: '100%', bgcolor: tokens.sky }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function AmountBars({
  rows,
  empty,
}: {
  rows: { id: string; href?: string; label: string; detail: string; amount: number; tone: string }[];
  empty: string;
}) {
  if (rows.length === 0) return <EmptyLine>{empty}</EmptyLine>;
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <Box role="img" aria-label={rows.map((row) => `${row.label} ${row.detail}`).join(', ')}>
      {rows.map((row) => (
        <Box key={row.id} sx={{ py: 0.9 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
            {row.href ? <RouterLink to={row.href}>{row.label}</RouterLink> : <Typography>{row.label}</Typography>}
            <Typography variant="body2" color="text.secondary">{row.detail}</Typography>
          </Box>
          <Box sx={{ mt: 0.6, height: 8, borderRadius: 99, bgcolor: tokens.neutralSoft, overflow: 'hidden' }} aria-hidden>
            <Box sx={{ width: `${(row.amount / max) * 100}%`, height: '100%', bgcolor: row.tone }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
