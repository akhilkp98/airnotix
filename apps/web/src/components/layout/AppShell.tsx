import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { Outlet, useLocation } from 'react-router';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { SIDEBAR_STORAGE_KEY } from '../../domain/demoData';
import { useAuth } from '../../features/auth/AuthProvider';
import { tokens } from '../../theme/tokens';
import { workspaceMaxWidth } from './contentWidth';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

function readCollapsed() {
  try {
    return window.sessionStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function AppShell() {
  const { user } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [trackedPath, setTrackedPath] = useState(location.pathname);

  if (trackedPath !== location.pathname) {
    setTrackedPath(location.pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (!user) return null;

  const onMenu = () => {
    if (isDesktop) {
      setCollapsed((value) => {
        const next = !value;
        try {
          window.sessionStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
        } catch {
          // Collapse still applies for this view when storage is blocked.
        }
        return next;
      });
      return;
    }
    setMobileOpen(true);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Box
        component="a"
        href="#main"
        sx={{
          position: 'absolute',
          left: 16,
          top: -48,
          zIndex: 2000,
          bgcolor: tokens.navy,
          color: tokens.white,
          px: 1.5,
          py: 1,
          borderRadius: 1,
          '&:focus': { top: 16 },
        }}
      >
        Skip to content
      </Box>
      <Sidebar
        variant={user.role === 'cadet' ? 'portal' : 'staff'}
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        isDesktop={isDesktop}
        onClose={() => setMobileOpen(false)}
      />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TopBar isDesktop={isDesktop} collapsed={collapsed} mobileOpen={mobileOpen} onMenu={onMenu} />
        <Box
          component="main"
          id="main"
          ref={mainRef}
          sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: workspaceMaxWidth,
              minWidth: 0,
              mx: 'auto',
              boxSizing: 'border-box',
              px: { xs: 2, sm: 2.5, md: 3 },
              py: { xs: 2, md: 3 },
            }}
          >
            <Outlet />
          </Box>
          <Box
            component="footer"
            sx={{
              mt: 'auto',
              width: '100%',
              maxWidth: workspaceMaxWidth,
              minWidth: 0,
              mx: 'auto',
              boxSizing: 'border-box',
              px: { xs: 2, sm: 2.5, md: 3 },
              py: 2,
              color: 'text.secondary',
              fontSize: 12,
            }}
          >
            © 2026 Arionix Global LLP
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
