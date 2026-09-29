import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate } from '../../domain/calculations';
import { detailGridSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { PortalGate } from './PortalGate';

export function PortalProfilePage() {
  return (
    <PortalGate>
      {(home) => {
        const rows: Array<[string, string]> = [
          ['Cadet number', home.code],
          ['Name', `${home.firstName} ${home.lastName}`],
          ['Email', home.email],
          ['Phone', home.phone],
          ['Course', home.courseName],
          ['Batch', home.batch],
          ['Joined', formatDate(home.joiningDate)],
        ];
        return (
          <>
            <PageHeader
              title="My Profile"
              subtitle="The fields stored on your cadet record. This page does not edit them, and no profile photo is stored."
            />
            <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography component="h2" sx={{ fontWeight: 600 }}>{home.firstName} {home.lastName}</Typography>
                <StatusChip status={home.status} />
              </Box>
              <Box sx={detailGridSx}>
                {rows.map(([label, value]) => (
                  <Box key={label} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{value || '—'}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        );
      }}
    </PortalGate>
  );
}
