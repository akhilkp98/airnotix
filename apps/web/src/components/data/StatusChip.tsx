import Chip from '@mui/material/Chip';
import { tokens } from '../../theme/tokens';

const tones = {
  positive: { bg: tokens.successSoft, color: '#1B5E34' },
  warning: { bg: tokens.warningSoft, color: '#8A5A00' },
  danger: { bg: tokens.dangerSoft, color: '#9E2B2B' },
  info: { bg: tokens.infoSoft, color: '#1E4E9C' },
  neutral: { bg: tokens.neutralSoft, color: '#314056' },
} as const;

const statusTone: Record<string, keyof typeof tones> = {
  Active: 'positive',
  Accepted: 'positive',
  Approved: 'positive',
  Available: 'positive',
  Completed: 'positive',
  'On Hold': 'warning',
  'Awaiting approval': 'warning',
  Pending: 'warning',
  Restricted: 'warning',
  Limited: 'warning',
  'Low stock': 'warning',
  Medium: 'warning',
  Open: 'warning',
  High: 'danger',
  Maintenance: 'danger',
  'In progress': 'info',
  Rejected: 'danger',
  Overdue: 'danger',
  Draft: 'info',
  'Release recorded': 'neutral',
};

export function StatusChip({ status }: { status: string }) {
  const tone = tones[statusTone[status] ?? 'neutral'];
  return (
    <Chip
      label={status}
      size="small"
      sx={{ bgcolor: tone.bg, color: tone.color, border: 'none' }}
    />
  );
}
