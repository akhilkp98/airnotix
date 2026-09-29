import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Link, useLocation } from 'react-router';
import { tokens } from '../../theme/tokens';
import { filterNav, isNavActive, PORTAL_NAV, STAFF_NAV, type NavItem } from './navigation';
import { useAuth } from '../../features/auth/AuthProvider';

const EXPANDED = 260;
const COLLAPSED = 76;

const sidebarScroll = {
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255, 255, 255, 0.28) transparent',
  '&::-webkit-scrollbar': { width: 8 },
  '&::-webkit-scrollbar-track': { background: 'transparent', marginBlock: 8 },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 999,
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
  },
  '&:hover::-webkit-scrollbar-thumb': {
    backgroundColor: `color-mix(in srgb, ${tokens.lime} 50%, transparent)`,
  },
} as const;

export function Sidebar({
  variant,
  mobileOpen,
  collapsed,
  onClose,
  isDesktop,
}: {
  variant: 'staff' | 'portal';
  mobileOpen: boolean;
  collapsed: boolean;
  onClose: () => void;
  isDesktop: boolean;
}) {
  const { can, homePath } = useAuth();
  const location = useLocation();
  const compact = isDesktop && collapsed;
  const width = compact ? COLLAPSED : EXPANDED;
  const entries = filterNav(variant === 'portal' ? PORTAL_NAV : STAFF_NAV, can);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 2 }}>
      <Box
        component={Link}
        to={homePath}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'flex-start',
          px: compact ? 1 : 2.5,
          mb: 2,
          minHeight: 48,
          textDecoration: 'none',
        }}
      >
        <Box
          component="img"
          src={compact ? '/favicon.png' : '/airnotix-logo-white.png'}
          alt="Airnotix"
          sx={{ width: compact ? 32 : 148, height: 'auto', display: 'block', bgcolor: 'transparent' }}
        />
      </Box>
      <Box component="nav" aria-label={variant === 'portal' ? 'Cadet navigation' : 'Academy navigation'} sx={{ overflowY: 'auto', flex: 1, ...sidebarScroll }}>
        {entries.map((entry) => (
          entry.kind === 'group' ? (
            compact ? null : (
            <Typography
              key={entry.label}
              component="p"
              sx={{
                m: 0,
                px: 3,
                pt: 2,
                pb: 0.75,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.68)',
              }}
            >
              {entry.label}
            </Typography>
            )
          ) : (
            <NavRow key={entry.id} item={entry} active={isNavActive(location.pathname, entry)} compact={compact} onNavigate={onClose} />
          )
        ))}
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isDesktop ? 'permanent' : 'temporary'}
      open={isDesktop ? true : mobileOpen}
      onClose={onClose}
      data-testid="app-sidebar"
      ModalProps={{ keepMounted: true }}
      sx={{
        width,
        flexShrink: 0,
        transition: 'width 180ms ease',
        '& .MuiDrawer-paper': {
          width,
          transition: 'width 180ms ease',
          boxSizing: 'border-box',
          bgcolor: tokens.navy,
          color: tokens.white,
          borderRight: 'none',
          overflow: 'hidden',
        },
      }}
    >
      {drawer}
    </Drawer>
  );
}

function NavRow({
  item,
  active,
  compact,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  compact: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Box
      component={Link}
      to={item.to}
      data-testid={`nav-${item.id}`}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        mx: 1.5,
        mb: 0.25,
        px: 1.25,
        minHeight: 40,
        borderRadius: '8px',
        textDecoration: 'none',
        color: active ? tokens.lime : 'rgba(255,255,255,0.78)',
        bgcolor: active ? 'rgba(142, 229, 63, 0.16)' : 'transparent',
        justifyContent: compact ? 'center' : 'flex-start',
        '&:hover': { bgcolor: active ? 'rgba(142, 229, 63, 0.2)' : 'rgba(255,255,255,0.06)' },
        '&:focus-visible': { outline: `2px solid ${tokens.lime}`, outlineOffset: 2 },
      }}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      {compact ? null : (
        <Box component="span" sx={{ fontSize: 14, fontWeight: active ? 600 : 500, lineHeight: 1.2 }}>
          {item.label}
        </Box>
      )}
    </Box>
  );

  if (!compact) return link;
  return (
    <Tooltip title={item.label} placement="right">
      {link}
    </Tooltip>
  );
}
