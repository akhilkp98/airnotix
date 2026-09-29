import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { useReportQuery } from './reportQueries';
import {
  canViewReport,
  REPORTS,
  reportKind,
  reportToCsv,
  type ReportFilters,
  type ReportKind,
  type ReportModel,
} from './reportRules';

function filtersFrom(params: URLSearchParams): ReportFilters {
  return {
    courseId: params.get('course') ?? '',
    status: params.get('status') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    aircraftId: params.get('aircraft') ?? '',
    instructorId: params.get('instructor') ?? '',
    fuelType: params.get('type') ?? '',
    review: params.get('review') ?? '',
    search: params.get('q') ?? '',
  };
}

export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const kind = reportKind(params.get('report'));
  const filters = filtersFrom(params);
  const { can } = useAuth();
  const access = { finance: can('finance.view'), audit: can('audit.view') };
  const allowed = canViewReport(kind, access);
  const query = useReportQuery(kind, filters, allowed);
  const options = useReportOptions();
  const visibleReports = REPORTS.filter(([id]) => canViewReport(id, access));

  const setReport = (next: ReportKind) => {
    setParams(next === 'roster' ? {} : { report: next });
  };

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const download = () => {
    if (!query.data) return;
    const blob = new Blob([reportToCsv(query.data)], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'airnotix-demo-report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Tables from the records already in this workspace. Filters narrow those rows. This is not a regulatory or financial-performance report."
        actions={allowed && can('reports.export') ? (
          <Button variant="outlined" color="inherit" onClick={download} disabled={!query.data}>Demo CSV</Button>
        ) : null}
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {visibleReports.map(([id, label]) => (
          <Button key={id} size="small" variant={kind === id ? 'contained' : 'outlined'} color={kind === id ? 'accent' : 'inherit'} onClick={() => setReport(id)}>
            {label}
          </Button>
        ))}
      </Box>
      {!allowed ? (
        <EmptyState
          title="This report is not available"
          body={kind === 'fees'
            ? 'Fee collection is limited to demonstration roles that can view finance. Totals are not shown here.'
            : 'Audit activity is limited to demonstration roles that can view the audit log. Events are not shown here.'}
        />
      ) : null}
      {allowed && (query.isLoading || options.isLoading) ? <CircularProgress aria-label="Loading reports" sx={{ color: 'primary.main' }} /> : null}
      {allowed && (query.isError || options.isError) ? (
        <EmptyState
          title="The report did not load"
          body="The workspace records could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      ) : null}
      {allowed && query.data && options.data ? (
        <ReportBody report={query.data} kind={kind} filters={filters} options={options.data} onChange={setFilter} />
      ) : null}
    </>
  );
}

function ReportBody({
  report,
  kind,
  filters,
  options,
  onChange,
}: {
  report: ReportModel;
  kind: ReportKind;
  filters: ReportFilters;
  options: {
    courses: { id: string; name: string }[];
    statuses: string[];
    aircraft: { id: string; code: string }[];
    aircraftStatuses: string[];
    instructors: { id: string; name: string }[];
    fuelTypes: string[];
    reviews: string[];
  };
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      <ReportFiltersBar kind={kind} filters={filters} options={options} onChange={onChange} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{report.note}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 1.5, mt: 2 }}>
        {report.cards.map((card) => (
              <Box key={card.label} sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, p: 2, bgcolor: tokens.surface }}>
                <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                <Typography sx={{ fontWeight: 700, color: tokens.navy, mt: 0.5 }}>{card.value}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{card.hint}</Typography>
              </Box>
            ))}
          </Box>
      {report.bars.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>Counts in this report</Typography>
          {report.bars.map((bar) => (
            <Box key={bar.label} sx={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 180px) 1fr 32px', gap: 1, alignItems: 'center', mb: 0.75 }}>
              <Typography variant="body2">{bar.label}</Typography>
              <Box sx={{ height: 8, borderRadius: 99, bgcolor: tokens.neutralSoft }}>
                <Box sx={{ width: `${report.rows.length ? Math.round((bar.count / report.rows.length) * 100) : 0}%`, height: '100%', borderRadius: 99, bgcolor: tokens.lime }} />
              </Box>
              <Typography variant="body2">{bar.count}</Typography>
            </Box>
          ))}
        </Box>
      ) : null}
      {report.rows.length === 0 ? (
        <Box sx={{ mt: 2 }}>
          <EmptyState
            title={report.unfilteredCount === 0 ? 'No rows are in this report.' : 'No rows match these filters.'}
            body="The table is built from stored records only."
          />
        </Box>
      ) : (
        <Box component="table" sx={{ width: '100%', mt: 2, borderCollapse: 'collapse', '& td, & th': { textAlign: 'left', p: 1, borderBottom: `1px solid ${tokens.line}`, fontSize: 14 } }}>
          <thead>
            <tr>{report.columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.id}>{row.cells.map((cell, index) => <td key={`${row.id}-${index}`}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </Box>
      )}
    </>
  );
}

function useReportOptions() {
  const repository = useWorkspaceRepository();
  return useQuery({
    queryKey: ['reports', 'options'],
    queryFn: async () => {
      const records = await repository.reportRecords();
      return {
        courses: records.courses.map((course) => ({ id: course.id, name: course.name })),
        statuses: [...new Set(records.cadets.map((cadet) => cadet.status))],
        aircraft: records.aircraft.map((item) => ({ id: item.id, code: item.code })),
        aircraftStatuses: [...new Set(records.aircraft.map((item) => item.status))],
        instructors: records.staff.map((member) => ({ id: member.id, name: member.name })),
        fuelTypes: [...new Set(records.fuelTransactions.map((tx) => tx.type))],
        reviews: [...new Set(records.documents.map((document) => document.review))],
      };
    },
  });
}

function ReportFiltersBar({
  kind,
  filters,
  options,
  onChange,
}: {
  kind: ReportKind;
  filters: ReportFilters;
  options: {
    courses: { id: string; name: string }[];
    statuses: string[];
    aircraft: { id: string; code: string }[];
    aircraftStatuses: string[];
    instructors: { id: string; name: string }[];
    fuelTypes: string[];
    reviews: string[];
  };
  onChange: (key: string, value: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
      {kind === 'roster' || kind === 'fees' ? (
        <AppSelect label="Course" value={filters.courseId} onChange={(value) => onChange('course', value)} sx={{ minWidth: 180 }} options={[{ value: '', label: 'All courses' }, ...options.courses.map((course) => ({ value: course.id, label: course.name }))]} />
      ) : null}
      {kind === 'roster' || kind === 'progress' ? (
        <AppSelect label="Status" value={filters.status} onChange={(value) => onChange('status', value)} sx={{ minWidth: 160 }} options={[{ value: '', label: 'All statuses' }, ...options.statuses.map((status) => ({ value: status, label: status }))]} />
      ) : null}
      {kind === 'fleet' ? (
        <AppSelect label="Status" value={filters.status} onChange={(value) => onChange('status', value)} sx={{ minWidth: 160 }} options={[{ value: '', label: 'All statuses' }, ...options.aircraftStatuses.map((status) => ({ value: status, label: status }))]} />
      ) : null}
      {kind === 'hours' || kind === 'fuel' ? (
        <>
          <TextField type="date" label="From" value={filters.from} onChange={(event) => onChange('from', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField type="date" label="To" value={filters.to} onChange={(event) => onChange('to', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </>
      ) : null}
      {kind === 'hours' ? (
        <>
          <AppSelect label="Aircraft" value={filters.aircraftId} onChange={(value) => onChange('aircraft', value)} sx={{ minWidth: 160 }} options={[{ value: '', label: 'All aircraft' }, ...options.aircraft.map((item) => ({ value: item.id, label: item.code }))]} />
          <AppSelect label="Instructor" value={filters.instructorId} onChange={(value) => onChange('instructor', value)} sx={{ minWidth: 180 }} options={[{ value: '', label: 'All instructors' }, ...options.instructors.map((member) => ({ value: member.id, label: member.name }))]} />
        </>
      ) : null}
      {kind === 'fuel' ? (
        <AppSelect label="Type" value={filters.fuelType} onChange={(value) => onChange('type', value)} sx={{ minWidth: 160 }} options={[{ value: '', label: 'All types' }, ...options.fuelTypes.map((type) => ({ value: type, label: type }))]} />
      ) : null}
      {kind === 'documents' ? (
        <AppSelect label="Review" value={filters.review} onChange={(value) => onChange('review', value)} sx={{ minWidth: 160 }} options={[{ value: '', label: 'All reviews' }, ...options.reviews.map((review) => ({ value: review, label: review }))]} />
      ) : null}
      {kind === 'audit' ? (
        <TextField label="Search" value={filters.search} onChange={(event) => onChange('q', event.target.value)} placeholder="Actor, action, or summary" sx={{ minWidth: 240 }} />
      ) : null}
    </Box>
  );
}
