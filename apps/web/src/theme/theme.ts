import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

const base = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 600, md: 768, lg: 992, xl: 1440 },
  },
  palette: {
    primary: { main: tokens.navy, contrastText: tokens.white },
    secondary: { main: tokens.muted, contrastText: tokens.white },
    success: { main: tokens.success, contrastText: tokens.white },
    info: { main: tokens.info, contrastText: tokens.white },
    warning: { main: tokens.warning, contrastText: tokens.navy },
    error: { main: tokens.danger, contrastText: tokens.white },
    background: { default: tokens.page, paper: tokens.surface },
    text: { primary: tokens.ink, secondary: tokens.muted },
    divider: tokens.line,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: tokens.navy },
    h2: { fontSize: '1.125rem', fontWeight: 600, color: tokens.navy },
    body1: { fontSize: '0.9375rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
  },
});

export const theme = createTheme(base, {
  palette: {
    accent: base.palette.augmentColor({
      color: {
        main: tokens.lime,
        dark: tokens.limeHover,
        light: tokens.limeSoft,
        contrastText: tokens.navy,
      },
      name: 'accent',
    }),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: tokens.page, color: tokens.ink },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, minHeight: 40, paddingInline: 16, boxShadow: 'none' },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${tokens.line}`,
          boxShadow: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: tokens.white,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.line },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C5CED9' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.navy, borderWidth: 1 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { '&.Mui-focused': { color: tokens.navy } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 999 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12, border: `1px solid ${tokens.line}`, boxShadow: '0 16px 40px rgba(16, 28, 44, 0.12)' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          border: `1px solid ${tokens.line}`,
          boxShadow: '0 8px 24px rgba(16, 28, 44, 0.08)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 40,
          fontSize: '0.875rem',
          whiteSpace: 'normal',
          '&.Mui-selected': {
            backgroundColor: tokens.limeSoft,
            color: tokens.navy,
            '&:hover': { backgroundColor: tokens.limeSoft },
          },
        },
      },
    },
  },
});
