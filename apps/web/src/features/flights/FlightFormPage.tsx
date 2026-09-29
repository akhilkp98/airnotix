import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useSearchParams } from 'react-router';
import { EmptyState } from '../../components/data/EmptyState';
import { PageHeader } from '../../components/data/PageHeader';
import { flightDate } from './flightRules';
import { FlightForm } from './FlightForm';
import { useFlightFormQuery } from './flightQueries';

export function FlightFormPage() {
  const query = useFlightFormQuery();
  const [params] = useSearchParams();

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Schedule flight" subtitle="Loading cadets, instructors, and aircraft." />
        <CircularProgress aria-label="Loading flight form" sx={{ color: 'primary.main' }} />
      </>
    );
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Schedule flight" subtitle="The flight form could not be read." />
        <EmptyState
          title="The flight form did not load"
          body="The demonstration records could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      </>
    );
  }

  return (
    <FlightForm
      cadets={query.data.cadets}
      staff={query.data.staff}
      aircraft={query.data.aircraft}
      items={query.data.items}
      initialDate={flightDate(params.get('date'))}
    />
  );
}
