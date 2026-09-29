import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { PageHeader } from '../../components/data/PageHeader';
import { formatDate } from '../../domain/calculations';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { refreshNotifications } from '../notifications/notificationQueries';
import { PortalGate } from './PortalGate';
import { portalNotePath } from './portalRules';

export function PortalNotificationsPage() {
  const repository = useWorkspaceRepository();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const markOne = async (id: string) => {
    await repository.markNotificationRead(id);
    await refreshNotifications(queryClient);
  };

  const markAll = async () => {
    await repository.markAllNotificationsRead(user ?? undefined);
    await refreshNotifications(queryClient);
  };

  return (
    <PortalGate>
      {(home) => {
        const unread = home.notifications.filter((note) => !note.read).length;
        return (
          <>
            <PageHeader
              title="Notifications"
              subtitle="Messages stored for your cadet account. This is not email, SMS, or a live feed."
              actions={unread > 0 ? <Button variant="outlined" color="inherit" onClick={() => { void markAll(); }}>Mark all read</Button> : null}
            />
            {home.notifications.length === 0 ? <Typography color="text.secondary">No notifications.</Typography> : (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {home.notifications.map((note) => {
                  const path = portalNotePath(note.href);
                  return (
                    <Box key={note.id} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, bgcolor: tokens.surface, p: 1.5, opacity: note.read ? 0.75 : 1 }}>
                      <Typography sx={{ fontWeight: note.read ? 500 : 700 }}>{note.title}</Typography>
                      <Typography variant="body2">{note.body}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDate(note.at)}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        {path ? <Button component={RouterLink} to={path} size="small">Open</Button> : null}
                        {note.read ? null : <Button size="small" color="inherit" onClick={() => { void markOne(note.id); }}>Mark read</Button>}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        );
      }}
    </PortalGate>
  );
}
