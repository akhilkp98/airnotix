import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { formatDate } from '../../domain/calculations';
import { tokens } from '../../theme/tokens';
import { PortalGate } from './PortalGate';

export function PortalTrainingPage() {
  return (
    <PortalGate>
      {(home) => (
        <>
          <PageHeader
            title="My Training"
            subtitle={`Illustrative progress ${home.progressPercent}%. Released progress only. Internal comments are not shown. This is not a licence or a formal course completion.`}
          />
          <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 }, mb: 2 }}>
            <Typography sx={{ fontWeight: 600 }}>{home.courseName || 'No course is linked.'}</Typography>
            <Typography variant="body2" color="text.secondary">{home.syllabusLabel || 'No syllabus is linked.'}{home.syllabusStatus ? ` · ${home.syllabusStatus}` : ''}</Typography>
            {home.courseStatus ? <Box sx={{ mt: 1 }}><StatusChip status={home.courseStatus} /></Box> : null}
          </Box>
          {home.phases.length === 0 ? <Typography color="text.secondary">No syllabus items are published on this record.</Typography> : home.phases.map((phase) => (
            <Box key={phase.id} sx={{ mb: 2 }}>
              <Typography component="h2" sx={{ fontWeight: 600 }}>{phase.name}</Typography>
              <Box component="ul" sx={{ mt: 0.5 }}>
                {phase.items.map((item) => (
                  <li key={item.id}>{item.name} · {item.recorded ? 'Recorded' : 'Outstanding'}</li>
                ))}
              </Box>
            </Box>
          ))}
          <Typography component="h2" sx={{ fontWeight: 600, mt: 2 }}>Assessments</Typography>
          {home.assessments.length === 0 ? (
            <Typography color="text.secondary">No assessments are recorded.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
              {home.assessments.map((assessment) => (
                <Box key={assessment.id} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, p: 1.5, bgcolor: tokens.surface }}>
                  <Typography sx={{ fontWeight: 600 }}>{assessment.itemName}</Typography>
                  <Typography variant="body2">{assessment.outcome} · {assessment.assessor || 'Assessor not recorded'} · {formatDate(assessment.date)}</Typography>
                </Box>
              ))}
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>You cannot record or change an assessment from this page.</Typography>
        </>
      )}
    </PortalGate>
  );
}
