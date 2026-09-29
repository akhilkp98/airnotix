import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { tokens } from '../../theme/tokens';

export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box
      sx={{
        bgcolor: tokens.surface,
        border: `1px solid ${tokens.line}`,
        borderRadius: 3,
        px: 2.25,
        py: 2,
        minHeight: 112,
        minWidth: 0,
        height: '100%',
      }}
    >
      <Typography
        component="p"
        sx={{ m: 0, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'text.secondary' }}
      >
        {label}
      </Typography>
      <Typography component="p" sx={{ m: 0, mt: 1, fontSize: '1.75rem', fontWeight: 600, color: tokens.navy, lineHeight: 1.15, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}
