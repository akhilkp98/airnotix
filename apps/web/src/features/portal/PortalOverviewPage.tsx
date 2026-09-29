import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate, inr } from '../../domain/calculations';
import { tokens } from '../../theme/tokens';
import { PortalGate } from './PortalGate';
import { portalNotePath, upcomingFlights } from './portalRules';

export function PortalOverviewPage() {
  return (
    <PortalGate>
      {(home) => {
        const next = upcomingFlights(home.flights)[0];
        const pendingDocuments = home.documents.filter((document) => document.review === 'Pending').length;
        const unread = home.notifications.filter((note) => !note.read).length;
        const cards = [
          ['Illustrative progress', `${home.progressPercent}%`, 'Completed items against the course count. Not a licence or course certificate.'],
          ['Recorded hours', String(home.recordedHours), 'Opening hours plus completed flights. Not a regulatory hour total.'],
          ['Upcoming flights', String(upcomingFlights(home.flights).length), 'Approved flights on or after the demo day.'],
          ['Pending documents', String(pendingDocuments), 'Stored review label Pending. Not a regulator check.'],
          ['Outstanding fees', inr(home.outstanding), 'Illustrative account. A recorded payment is not a confirmed settlement.'],
          ['Unread notifications', String(unread), 'Rows addressed to this cadet. Not a live feed.'],
        ];
        return (
          <>
            <PageHeader
              title={`Hello, ${home.firstName}`}
              subtitle={`${home.code} · ${home.courseName || 'No course is linked.'}`}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 1.5 }}>
              {cards.map(([label, value, hint]) => (
                <Box key={label} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, bgcolor: tokens.surface, p: 2, minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography sx={{ fontWeight: 700, color: tokens.navy, mt: 0.5 }}>{value}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{hint}</Typography>
                </Box>
              ))}
            </Box>
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
            <Section title="Training progress">
              <Typography>Illustrative progress {home.progressPercent}% · {home.syllabusLabel || 'No syllabus is linked.'}</Typography>
              <Typography variant="body2" color="text.secondary">This percentage is not a formal course completion or a licence eligibility measure.</Typography>
              <Box sx={{ mt: 1 }}><RouterLink to="/portal/training">My training</RouterLink></Box>
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
          </>
        );
      }}
    </PortalGate>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ mt: 2, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
      <Typography component="h2" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
      {children}
    </Box>
  );
}
