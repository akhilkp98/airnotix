import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Check, LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ACADEMY, DEMO_USERS } from '../../domain/demoData';
import { ROLE_LABELS } from '../../domain/permissions';
import { useAuth } from '../../features/auth/AuthProvider';
import { NotificationButton } from '../../features/notifications/NotificationButton';
import { useAcademyQuery, useDemoUsersQuery } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useConfirm } from '../feedback/confirm';
import { useSnackbar } from '../feedback/snackbar';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

export function TopBar({
  isDesktop,
  collapsed,
  mobileOpen,
  onMenu,
}: {
  isDesktop: boolean;
  collapsed: boolean;
  mobileOpen: boolean;
  onMenu: () => void;
}) {
  const { user, can, signOut, switchUser } = useAuth();
  const academyQuery = useAcademyQuery();
  const usersQuery = useDemoUsersQuery();
  const academy = academyQuery.data ?? ACADEMY;
  const accounts = usersQuery.data ?? DEMO_USERS;
  const confirm = useConfirm();
  const { notify } = useSnackbar();
  const navigate = useNavigate();
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const showSearch = can('cadets.view') || can('flights.view') || can('fleet.view');

  if (!user) return null;

  const signOutNow = async () => {
    setAccountAnchor(null);
    const accepted = await confirm({
      title: 'Sign out?',
      body: 'This ends the demonstration session in this browser. It does not change academy records.',
      confirmLabel: 'Sign out',
    });
    if (!accepted) return;
    signOut();
    navigate('/login', { replace: true });
  };

  const chooseRole = (userId: string) => {
    const next = switchUser(userId);
    setAccountAnchor(null);
    if (!next) return;
    navigate(next.role === 'cadet' ? '/portal' : '/dashboard', { replace: true });
    notify(`Switched to ${next.name}`);
  };

  return (
    <Box
      component="header"
      sx={{
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: { xs: 1.5, md: 2.5 },
        bgcolor: tokens.white,
        borderBottom: `1px solid ${tokens.line}`,
      }}
    >
      <IconButton
        aria-label={isDesktop ? (collapsed ? 'Expand navigation' : 'Collapse navigation') : 'Open navigation'}
        aria-expanded={isDesktop ? !collapsed : mobileOpen}
        onClick={onMenu}
        sx={{ color: tokens.navy }}
      >
        {isDesktop ? (collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />) : <MenuIcon size={20} />}
      </IconButton>
      <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
        <Typography noWrap sx={{ fontWeight: 600, color: tokens.navy, fontSize: 15 }}>
          {academy.name}
        </Typography>
      </Box>
      <Chip
        label={academy.branchName}
        size="small"
        variant="outlined"
        sx={{ display: { xs: 'none', md: 'inline-flex' }, borderColor: tokens.line, color: tokens.ink, fontWeight: 600 }}
      />
      <Box sx={{ flex: 1 }} />
      {showSearch ? (
        <Box component="form" onSubmit={(event) => { event.preventDefault(); notify('Search will be available when academy records are connected.'); }} sx={{ display: { xs: 'none', lg: 'block' }, width: 280 }}>
          <TextField
            size="small"
            fullWidth
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the academy"
            aria-label="Search the academy"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} aria-hidden="true" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      ) : null}
      <NotificationButton />
      <Button
        aria-haspopup="menu"
        aria-expanded={Boolean(accountAnchor)}
        onClick={(event) => setAccountAnchor(event.currentTarget)}
        sx={{ color: tokens.navy, minWidth: 0, px: 1 }}
        data-testid="account-menu"
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: tokens.lime,
            color: tokens.navy,
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            fontWeight: 700,
            mr: { xs: 0, sm: 1 },
          }}
        >
          {initials(user.name)}
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }} data-testid="current-user-name">{user.name}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.2 }}>{ROLE_LABELS[user.role]}</Typography>
        </Box>
      </Button>
      <Menu
        anchorEl={accountAnchor}
        open={Boolean(accountAnchor)}
        onClose={() => setAccountAnchor(null)}
        slotProps={{ paper: { sx: { width: 280, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography sx={{ fontWeight: 600 }}>{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">{user.email}</Typography>
        </Box>
        <Divider />
        <Typography sx={{ px: 2, pt: 1.25, pb: 0.5, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Demonstration roles
        </Typography>
        {accounts.map((account) => (
            <MenuItem
              key={account.id}
              data-testid={`role-${account.id}`}
              onClick={() => chooseRole(account.id)}
              selected={account.id === user.id}
              sx={{ '&.Mui-selected': { bgcolor: tokens.limeSoft }, '&.Mui-selected:hover': { bgcolor: tokens.limeSoft } }}
            >
            <Box sx={{ width: 18, mr: 1, display: 'grid', placeItems: 'center' }}>
              {account.id === user.id ? <Check size={16} /> : null}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14 }}>{account.name}</Typography>
              <Typography variant="body2" color="text.secondary">{ROLE_LABELS[account.role]}</Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider />
        {can('settings.manage') ? (
          <MenuItem onClick={() => { setAccountAnchor(null); navigate('/settings'); }}>Academy settings</MenuItem>
        ) : null}
        <MenuItem onClick={() => { void signOutNow(); }}>
          <LogOut size={16} style={{ marginRight: 8 }} />
          Sign out
        </MenuItem>
      </Menu>
    </Box>
  );
}
