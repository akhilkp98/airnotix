import { useState } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { formatDate } from '../../domain/calculations';
import { notificationRoute } from '../../domain/notifications';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { refreshNotifications, useNotificationQuery } from './notificationQueries';

export function NotificationButton() {
  const query = useNotificationQuery();
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const notes = query.data ?? [];
  const unread = notes.filter((item) => !item.read).length;
  const shown = notes.slice(0, 6);

  const openNote = async (id: string, href: string) => {
    await repository.markNotificationRead(id);
    await refreshNotifications(queryClient);
    setAnchor(null);
    const path = notificationRoute(href);
    if (path) navigate(path);
  };

  const markAll = async () => {
    await repository.markAllNotificationsRead(user ?? undefined);
    await refreshNotifications(queryClient);
  };

  return (
    <>
      <IconButton
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ color: tokens.navy }}
      >
        <Badge color="error" badgeContent={unread} invisible={unread === 0}>
          <Bell size={20} />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 320, maxWidth: '90vw' } } }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 600 }}>{unread ? `${unread} unread` : 'Notifications'}</Typography>
          {unread > 0 ? <Button size="small" color="inherit" onClick={() => { void markAll(); }}>Mark all read</Button> : null}
        </Box>
        {query.isError ? (
          <MenuItem disabled sx={{ opacity: '1 !important', whiteSpace: 'normal' }}>Notifications could not be read.</MenuItem>
        ) : shown.length === 0 ? (
          <MenuItem disabled sx={{ opacity: '1 !important', whiteSpace: 'normal' }}>No notifications for this role.</MenuItem>
        ) : shown.map((item) => (
          <MenuItem key={item.id} onClick={() => { void openNote(item.id, item.href); }} sx={{ whiteSpace: 'normal', alignItems: 'flex-start', opacity: item.read ? 0.7 : 1 }}>
            <Box>
              <Typography sx={{ fontWeight: item.read ? 500 : 700, fontSize: 14 }}>{item.title}</Typography>
              <Typography variant="body2" color="text.secondary">{item.body}</Typography>
              <Typography variant="caption" color="text.secondary">{formatDate(item.at)}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
