import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate, inr } from '../../domain/calculations';
import { detailGridSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';
import { PortalGate } from './PortalGate';

export function PortalFeesPage() {
  return (
    <PortalGate>
      {(home) => (
        <>
          <PageHeader
            title="My Fees"
            subtitle="Illustrative fee account from stored plans and recorded payments. A recorded payment is not a confirmed settlement. No payment gateway is connected."
          />
          <Box sx={{ ...detailGridSx, mb: 2 }}>
            <Fact label="Plan" value={home.planName || 'No fee plan is linked.'} />
            <Fact label="Billed" value={inr(home.billed)} />
            <Fact label="Recorded payments" value={inr(home.paid)} />
            <Fact label="Outstanding" value={inr(home.outstanding)} />
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Due {formatDate(home.feeDueDate)} {home.overdue ? <StatusChip status="Overdue" /> : null}
          </Typography>
          <Typography component="h2" sx={{ fontWeight: 600, mb: 1 }}>Payment history</Typography>
          {home.payments.length === 0 ? <Typography color="text.secondary">No payments are recorded.</Typography> : (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {home.payments.map((payment) => (
                <Box key={payment.id} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, bgcolor: tokens.surface, p: 1.5 }}>
                  <Typography sx={{ fontWeight: 600 }}>{inr(payment.amount)} · {payment.method}</Typography>
                  <Typography variant="body2" color="text.secondary">{formatDate(payment.date)} · {payment.reference}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </PortalGate>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, bgcolor: tokens.surface, p: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 700, color: tokens.navy }}>{value}</Typography>
    </Box>
  );
}
