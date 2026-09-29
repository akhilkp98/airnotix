import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Bell, CheckCircle2, Clock, FileText, GraduationCap, Plane, Wallet } from 'lucide-react';
import { Link as RouterLink } from 'react-router';
import { StatusChip } from '../../components/data/StatusChip';
import { PageHeader } from '../../components/data/PageHeader';
import { formatDate, inr } from '../../domain/calculations';
import { tokens } from '../../theme/tokens';
import { MetricGrid, MetricTile } from '../dashboard/dashboardWidgets';
import { PortalGate } from './PortalGate';
import { completedFlights, portalNotePath, upcomingFlights } from './portalRules';

export function PortalOverviewPage() {
  return (
    <PortalGate>
      {(home) => {
        const upcoming = upcomingFlights(home.flights);
        const next = upcoming[0];
        const completed = completedFlights(home.flights);
        const pendingDocuments = home.documents.filter((document) => document.review === 'Pending').length;
        const unread = home.notifications.filter((note) => !note.read).length;
        const feeTone = home.overdue ? 'rose' as const : 'navy' as const;
        const cards = [
          { label: 'Illustrative progress', value: `${home.progressPercent}%`, hint: 'Completed items against the course count. Not a licence or course certificate.', icon: GraduationCap, tone: 'sky' as const, to: '/portal/training' },
          { label: 'Recorded hours', value: String(home.recordedHours), hint: 'Opening hours plus completed flights. Not a regulatory hour total.', icon: Clock, tone: 'teal' as const, to: '/portal/training' },
          { label: 'Upcoming flights', value: String(upcoming.length), hint: 'Approved flights on or after the demo day.', icon: Plane, tone: 'navy' as const, to: '/portal/schedule' },
          { label: 'Completed flights', value: String(completed.length), hint: 'Completed flights stored for this cadet. Not a regulatory hour total.', icon: CheckCircle2, tone: 'teal' as const, to: '/portal/schedule' },
          { label: 'Pending documents', value: String(pendingDocuments), hint: 'Stored review label Pending. Not a regulator check.', icon: FileText, tone: 'amber' as const, to: '/portal/documents' },
          { label: 'Outstanding fees', value: inr(home.outstanding), hint: 'Illustrative account. A recorded payment is not a confirmed settlement.', icon: Wallet, tone: feeTone, to: '/portal/fees' },
          { label: 'Unread notifications', value: String(unread), hint: 'Rows addressed to this cadet. Not a live feed.', icon: Bell, tone: 'sky' as const, to: '/portal/notifications' },
        ];
        return (
          <>
            <PageHeader title={`Hello, ${home.firstName}`} subtitle={`${home.code} · ${home.courseName || 'No course is linked.'}`} />
            <MetricGrid>
              {cards.map((card) => (
                <MetricTile key={card.label} {...card} />
              ))}
            </MetricGrid>
            <Box sx={{ mt: 1.5, border: `1px solid ${tokens.line}`, borderRadius: '12px', bgcolor: tokens.surface, p: { xs: 1.75, sm: 2.25 } }}>
              <Typography component="h2" sx={{ fontWeight: 600, mb: 1 }}>Training progress</Typography>
              <Typography>Illustrative progress {home.progressPercent}% · {home.syllabusLabel || 'No syllabus is linked.'}</Typography>
              <Box sx={{ mt: 1, height: 10, borderRadius: 99, bgcolor: tokens.neutralSoft, overflow: 'hidden' }} aria-hidden>
                <Box sx={{ width: `${Math.max(0, Math.min(home.progressPercent, 100))}%`, height: '100%', bgcolor: tokens.sky }} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This percentage is not a formal course completion or a licence eligibility measure.</Typography>
              <Box sx={{ mt: 1 }}><RouterLink to="/portal/training">My training</RouterLink></Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mt: 1.5 }}>
              <Section title="Upcoming flights">
                {next ? (
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{next.reference} · {formatDate(next.date)} {next.start}–{next.end}</Typography>
                    <Typography variant="body2" color="text.secondary">{next.aircraftCode} · {next.instructorName}</Typography>
                    <StatusChip status={next.status} />
                    <Box sx={{ mt: 1 }}>
                      <RouterLink to={`/portal/schedule/${next.id}`}>Open flight</RouterLink>
                    </Box>
                  </Box>
                ) : <Typography color="text.secondary">No approved flight is scheduled.</Typography>}
                <Box sx={{ mt: 1 }}><RouterLink to="/portal/schedule">My flights</RouterLink></Box>
              </Section>
              <Section title="Completed flights">
                {completed.length === 0 ? <Typography color="text.secondary">No completed flights are stored.</Typography> : completed.map((flight) => (
                  <Box key={flight.id} sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{flight.reference} · {formatDate(flight.date)} {flight.start}–{flight.end}</Typography>
                    <Typography variant="body2" color="text.secondary">{flight.aircraftCode} · {flight.instructorName}{flight.hours === null ? '' : ` · ${flight.hours} h`}</Typography>
                    <RouterLink to={`/portal/schedule/${flight.id}`}>Open flight</RouterLink>
                  </Box>
                ))}
              </Section>
              <Section title="Recent activity">
                {home.notifications.length === 0 ? <Typography color="text.secondary">No notifications.</Typography> : home.notifications.slice(0, 3).map((note) => {
                  const path = portalNotePath(note.href);
                  return (
                    <Box key={note.id} sx={{ mb: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>{note.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{note.body}</Typography>
                      {path ? <RouterLink to={path}>Open</RouterLink> : null}
                    </Box>
                  );
                })}
                <RouterLink to="/portal/notifications">Notifications</RouterLink>
              </Section>
              <Section title="Outstanding items">
                {pendingDocuments > 0 ? <Box sx={{ mb: 1 }}><RouterLink to="/portal/documents">{pendingDocuments} document{pendingDocuments === 1 ? '' : 's'} pending review</RouterLink></Box> : <Typography color="text.secondary">No documents are pending review.</Typography>}
                {home.outstanding > 0 ? (
                  <Box sx={{ mt: 1 }}>
                    <RouterLink to="/portal/fees">{inr(home.outstanding)} outstanding{home.overdue ? ' · Overdue' : ''}</RouterLink>
                  </Box>
                ) : <Typography color="text.secondary" sx={{ mt: 1 }}>No outstanding fee balance is recorded.</Typography>}
              </Section>
            </Box>
          </>
        );
      }}
    </PortalGate>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0, border: `1px solid ${tokens.line}`, borderRadius: '12px', bgcolor: tokens.surface, p: { xs: 1.75, sm: 2.25 } }}>
      <Typography component="h2" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
      {children}
    </Box>
  );
}
