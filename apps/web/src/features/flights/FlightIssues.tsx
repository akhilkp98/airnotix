import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import type { ScheduleIssue } from '../../domain/workspace';

export function FlightIssues({ issues }: { issues: ScheduleIssue[] }) {
  if (issues.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No overlap, availability, or aircraft planning issues for these values.
      </Typography>
    );
  }
  const blockers = issues.filter((issue) => issue.level === 'blocker');
  const warnings = issues.filter((issue) => issue.level !== 'blocker');
  return (
    <>
      {blockers.length > 0 ? (
        <Alert severity="warning" sx={{ mb: warnings.length ? 1.5 : 0 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {blockers.map((issue) => (
              <li key={`${issue.resource}-${issue.message}`}>
                <strong>{`${issue.resource}. `}</strong>
                {issue.message}
                {issue.conflictId ? (
                  <>
                    {' '}
                    <RouterLink to={`/flight-operations/${issue.conflictId}`}>View conflict</RouterLink>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {warnings.length > 0 ? (
        <Alert severity="info">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {warnings.map((issue) => (
              <li key={`${issue.resource}-${issue.message}`}>
                <strong>{`${issue.resource}. `}</strong>
                {issue.message}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </>
  );
}
