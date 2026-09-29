import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

export function SummaryGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
        gap: 2,
        mb: 2,
        '& > *': { minWidth: 0 },
      }}
    >
      {children}
    </Box>
  );
}
