import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate } from '../../domain/calculations';
import { tokens } from '../../theme/tokens';
import { PortalGate } from './PortalGate';

export function PortalDocumentsPage() {
  return (
    <PortalGate>
      {(home) => (
        <>
          <PageHeader
            title="My Documents"
            subtitle="Documents stored against your cadet record. A review label is not a check that a file is authentic. Files are not stored in this browser, and you cannot accept or reject a document here."
          />
          {home.documents.length === 0 ? (
            <Typography color="text.secondary">No documents are linked to your record.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {home.documents.map((document) => (
                <Box key={document.id} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, bgcolor: tokens.surface, p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 600 }}>{document.title}</Typography>
                    <StatusChip status={document.review} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {document.category} · Recorded {formatDate(document.uploaded)} · Expires {document.expires ? formatDate(document.expires) : '—'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </PortalGate>
  );
}
