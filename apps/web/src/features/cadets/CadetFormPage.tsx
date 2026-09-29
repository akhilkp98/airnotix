import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { EmptyState } from '../../components/data/EmptyState';
import { PageHeader } from '../../components/data/PageHeader';
import { CadetForm } from './CadetForm';
import { useCadetFormOptionsQuery } from './cadetQueries';

export function CadetFormPage() {
  const query = useCadetFormOptionsQuery();

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Add cadet" subtitle="Cadet enrolment." />
        <CircularProgress aria-label="Loading enrolment form" sx={{ color: 'primary.main' }} />
      </>
    );
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Add cadet" subtitle="Cadet enrolment." />
        <EmptyState
          title="The enrolment form did not load"
          body="Courses and instructors could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      </>
    );
  }

  return (
    <CadetForm
      mode="create"
      courses={query.data.courses}
      staff={query.data.staff}
      branchName={query.data.branchName}
    />
  );
}
