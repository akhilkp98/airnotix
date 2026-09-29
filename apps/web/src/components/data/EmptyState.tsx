import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CircleDashed, type LucideIcon } from 'lucide-react';
import { tokens } from '../../theme/tokens';

export function EmptyState({
  title,
  body,
  action,
  icon: Icon = CircleDashed,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <Box
      sx={{
        border: `1px solid ${tokens.line}`,
        borderRadius: 3,
        bgcolor: tokens.surface,
        px: 3,
        py: 5,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: tokens.page,
          color: tokens.navy,
          display: 'grid',
          placeItems: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </Box>
      <Typography component="h2" variant="h2" sx={{ fontSize: '1.05rem', mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
        {body}
      </Typography>
      {action ? <Box sx={{ mt: 2.5 }}>{action}</Box> : null}
    </Box>
  );
}
