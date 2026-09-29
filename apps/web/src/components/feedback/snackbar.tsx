import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { tokens } from '../../theme/tokens';

type SnackbarContextValue = {
  notify: (message: string) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function AppSnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<{ id: number; message: string } | null>(null);

  const notify = useCallback((message: string) => {
    setSnack({ id: Date.now(), message });
  }, []);

  return (
    <SnackbarContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        key={snack?.id}
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSnack(null)}
          sx={{
            bgcolor: tokens.navy,
            color: tokens.white,
            alignItems: 'center',
            '& .MuiAlert-icon': { color: tokens.lime },
            '& .MuiAlert-action .MuiIconButton-root': { color: tokens.white },
          }}
        >
          {snack?.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const value = useContext(SnackbarContext);
  if (!value) throw new Error('Snackbar is not available.');
  return value;
}
