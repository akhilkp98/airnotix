import type { ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfirmProvider } from '../components/feedback/confirm';
import { AppSnackbarProvider } from '../components/feedback/snackbar';
import { AuthProvider } from '../features/auth/AuthProvider';
import { queryClient } from '../services/queryClient';
import { mockWorkspaceRepository } from '../services/repositories/mockWorkspaceRepository';
import { WorkspaceRepositoryProvider } from '../services/repositories/WorkspaceRepositoryProvider';
import { theme } from '../theme/theme';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <WorkspaceRepositoryProvider repository={mockWorkspaceRepository}>
          <AuthProvider>
            <ConfirmProvider>
              <AppSnackbarProvider>{children}</AppSnackbarProvider>
            </ConfirmProvider>
          </AuthProvider>
        </WorkspaceRepositoryProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
