import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router';
import { PageHeader } from '../../components/data/PageHeader';
import { formPanelSx } from '../../components/layout/contentWidth';
import { AppSelect } from '../../components/forms/AppSelect';
import { useSnackbar } from '../../components/feedback/snackbar';
import { DEMO_TODAY } from '../../domain/fixtures';
import type { Aircraft, Cadet, Flight, FlightInput, StaffMember } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { useAuth } from '../auth/AuthProvider';
import { FlightIssues } from './FlightIssues';
import { refreshAfterFlightChange, useFlightIssuesQuery } from './flightQueries';
import { FLIGHT_TYPES, instructorStaff, validateFlightDraft } from './flightRules';

type ItemOption = { id: string; name: string };

export function FlightForm({
  flight,
  cadets,
  staff,
  aircraft,
  items,
  initialDate,
}: {
  flight?: Flight;
  cadets: Cadet[];
  staff: StaffMember[];
  aircraft: Aircraft[];
  items: ItemOption[];
  initialDate?: string;
}) {
  const repository = useWorkspaceRepository();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [date, setDate] = useState(flight?.date ?? initialDate ?? DEMO_TODAY);
  const [start, setStart] = useState(flight?.start ?? '09:00');
  const [end, setEnd] = useState(flight?.end ?? '10:30');
  const [cadetId, setCadetId] = useState(flight?.cadetId ?? '');
  const [itemId, setItemId] = useState(flight?.itemId ?? items.find((item) => item.id === 'item-circuits')?.id ?? items[0]?.id ?? '');
  const [instructorId, setInstructorId] = useState(flight?.instructorId ?? '');
  const [aircraftId, setAircraftId] = useState(flight?.aircraftId ?? '');
  const [flightType, setFlightType] = useState(flight?.flightType ?? FLIGHT_TYPES[0]);
  const [notes, setNotes] = useState(flight?.notes ?? '');
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateFlightDraft>['fields']>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const input: FlightInput = {
    id: flight?.id,
    date,
    start,
    end,
    cadetId,
    itemId,
    instructorId,
    aircraftId,
    flightType,
    notes,
  };
  const issues = useFlightIssuesQuery(input, true);
  const instructors = instructorStaff(staff);

  const save = async (submit: boolean) => {
    const validation = validateFlightDraft({ date, start, end, cadetId, instructorId, aircraftId });
    setFieldErrors(validation.fields);
    setFormError(validation.message);
    if (!validation.ok) return;
    setBusy(true);
    const result = submit
      ? await repository.submitFlight(input, user ?? undefined)
      : await repository.saveFlightDraft(input, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    await refreshAfterFlightChange(queryClient);
    notify(submit ? 'Submitted for approval.' : 'Draft saved.');
    if (result.id) navigate(`/flight-operations/${result.id}`);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save(false);
  };

  return (
    <>
      <PageHeader
        title={flight ? `Edit ${flight.reference}` : 'Schedule flight'}
        subtitle="A draft may keep a conflict. Approval stays blocked until the conflict is cleared. The form will not switch the aircraft or instructor for you."
      />
      <Box component="form" noValidate onSubmit={onSubmit} sx={{ ...formPanelSx, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        {formError ? <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{formError}</Alert> : null}
        <TextField type="date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} error={Boolean(fieldErrors.date)} helperText={fieldErrors.date} slotProps={{ inputLabel: { shrink: true } }} required />
        <TextField type="time" label="Start" value={start} onChange={(event) => setStart(event.target.value)} error={Boolean(fieldErrors.start)} helperText={fieldErrors.start} slotProps={{ inputLabel: { shrink: true } }} required />
        <TextField type="time" label="End" value={end} onChange={(event) => setEnd(event.target.value)} error={Boolean(fieldErrors.end)} helperText={fieldErrors.end} slotProps={{ inputLabel: { shrink: true } }} required />
        <AppSelect label="Cadet" value={cadetId} onChange={setCadetId} error={Boolean(fieldErrors.cadetId)} helperText={fieldErrors.cadetId} required options={[{ value: '', label: 'Choose' }, ...cadets.map((cadet) => ({ value: cadet.id, label: `${cadet.firstName} ${cadet.lastName}` }))]} />
        <AppSelect label="Training item" value={itemId} onChange={setItemId} options={items.map((item) => ({ value: item.id, label: item.name }))} />
        <AppSelect label="Instructor" value={instructorId} onChange={setInstructorId} error={Boolean(fieldErrors.instructorId)} helperText={fieldErrors.instructorId} required options={[{ value: '', label: 'Choose' }, ...instructors.map((member) => ({ value: member.id, label: member.name }))]} />
        <AppSelect label="Aircraft" value={aircraftId} onChange={setAircraftId} error={Boolean(fieldErrors.aircraftId)} helperText={fieldErrors.aircraftId} required options={[{ value: '', label: 'Choose' }, ...aircraft.map((item) => ({ value: item.id, label: `${item.code} · ${item.status}` }))]} />
        <AppSelect label="Flight type" value={flightType} onChange={setFlightType} options={FLIGHT_TYPES.map((type) => ({ value: type, label: type }))} />
        <TextField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} sx={{ gridColumn: '1 / -1' }} />
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FlightIssues issues={issues.data ?? []} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            These checks are planning constraints. They do not authorize a flight release or decide airworthiness.
          </Typography>
        </Box>
        <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button type="submit" color="inherit" disabled={busy}>Save draft</Button>
          {can('flights.submit') ? (
            <Button type="button" variant="contained" color="accent" disabled={busy} onClick={() => { void save(true); }}>
              Submit for approval
            </Button>
          ) : null}
          <Button component={RouterLink} to={flight ? `/flight-operations/${flight.id}` : '/flight-operations'} color="inherit">Cancel</Button>
        </Box>
      </Box>
    </>
  );
}
