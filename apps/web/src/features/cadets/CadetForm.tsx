import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router';
import { PageHeader } from '../../components/data/PageHeader';
import { AppSelect } from '../../components/forms/AppSelect';
import { useSnackbar } from '../../components/feedback/snackbar';
import { formatDate } from '../../domain/calculations';
import { DEMO_TODAY } from '../../domain/fixtures';
import type { Cadet, CadetInput, Course, StaffMember } from '../../domain/workspace';
import { useAuth } from '../auth/AuthProvider';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import {
  DEFAULT_NEW_CADET_INSTRUCTOR_ID,
  NEW_CADET_FEE_DUE_DATE,
} from '../../services/repositories/workspaceStore';
import { instructorStaff, validateCadetForm, type CadetFieldErrors } from './cadetRules';
import { cadetQueryKeys } from './cadetQueries';
import { formPanelSx } from '../../components/layout/contentWidth';
import { tokens } from '../../theme/tokens';

export function CadetForm({
  mode,
  cadet,
  courses,
  staff,
  branchName,
}: {
  mode: 'create' | 'edit';
  cadet?: Cadet;
  courses: Course[];
  staff: StaffMember[];
  branchName: string;
}) {
  const repository = useWorkspaceRepository();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useSnackbar();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(cadet?.firstName ?? '');
  const [lastName, setLastName] = useState(cadet?.lastName ?? '');
  const [email, setEmail] = useState(cadet?.email ?? '');
  const [phone, setPhone] = useState(cadet?.phone ?? '');
  const [dob, setDob] = useState(cadet?.dob ?? '');
  const [courseId, setCourseId] = useState(cadet?.courseId ?? '');
  const [batch, setBatch] = useState(cadet?.batch ?? '');
  const [joiningDate, setJoiningDate] = useState(cadet?.joiningDate ?? DEMO_TODAY);
  const [instructorId, setInstructorId] = useState(cadet?.instructorId ?? '');
  const [errors, setErrors] = useState<CadetFieldErrors>({});
  const [formError, setFormError] = useState('');

  const defaultInstructor = staff.find((person) => person.id === DEFAULT_NEW_CADET_INSTRUCTOR_ID);
  const instructors = instructorStaff(staff);

  const save = useMutation({
    mutationFn: (payload: CadetInput) => repository.saveCadet(payload, user ?? undefined),
    onSuccess: async (result) => {
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      if (!result.id) {
        setFormError('The cadet could not be saved.');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['cadets'] });
      await queryClient.invalidateQueries({ queryKey: cadetQueryKeys.detail(user?.id ?? '', result.id) });
      notify('Cadet saved.');
      navigate(`/cadets/${result.id}`);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: CadetInput = {
      id: cadet?.id,
      firstName,
      lastName,
      email,
      phone,
      dob,
      courseId,
      batch,
      joiningDate,
      instructorId,
    };
    const validation = validateCadetForm(payload);
    setErrors(validation.errors);
    if (validation.error) {
      setFormError(validation.error);
      return;
    }
    setFormError('');
    save.mutate(payload);
  };

  return (
    <>
      <PageHeader
        title={mode === 'create' ? 'Add cadet' : 'Edit cadet'}
        subtitle={`${branchName}. Saving assigns the course's current published syllabus.`}
      />
      <Box
        component="form"
        onSubmit={submit}
        noValidate
        sx={{ ...formPanelSx, border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}
      >
        {formError ? <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert> : null}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            label="Cadet ID"
            value={cadet?.code ?? 'Assigned on save'}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            id="firstName"
            name="firstName"
            label="First name"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            error={Boolean(errors.firstName)}
            helperText={errors.firstName}
          />
          <TextField
            id="lastName"
            name="lastName"
            label="Last name"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            error={Boolean(errors.lastName)}
            helperText={errors.lastName}
          />
          <TextField
            id="email"
            name="email"
            type="email"
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email || 'Leave blank if there is no email address.'}
          />
          <TextField id="phone" name="phone" label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <TextField
            id="dob"
            name="dob"
            type="date"
            label="Date of birth"
            value={dob}
            onChange={(event) => setDob(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <AppSelect
            id="courseId"
            name="courseId"
            required
            label="Course"
            value={courseId}
            onChange={setCourseId}
            error={Boolean(errors.courseId)}
            helperText={errors.courseId}
            options={[
              { value: '', label: 'Choose' },
              ...courses.map((course) => ({ value: course.id, label: course.name })),
            ]}
          />
          <TextField
            id="batch"
            name="batch"
            label="Batch"
            value={batch}
            onChange={(event) => setBatch(event.target.value)}
            helperText={mode === 'create' ? 'If left blank, enrolment uses the course type plus -2026-A.' : undefined}
          />
          <TextField
            id="joiningDate"
            name="joiningDate"
            type="date"
            label="Joining date"
            required
            value={joiningDate}
            onChange={(event) => setJoiningDate(event.target.value)}
            error={Boolean(errors.joiningDate)}
            helperText={errors.joiningDate}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <AppSelect
            id="instructorId"
            name="instructorId"
            label="Instructor"
            value={instructorId}
            onChange={setInstructorId}
            helperText={mode === 'create'
              ? `If none is chosen, enrolment assigns ${defaultInstructor?.name ?? DEFAULT_NEW_CADET_INSTRUCTOR_ID}.`
              : 'Clearing this keeps the instructor already on the record.'}
            options={[
              { value: '', label: 'Choose' },
              ...instructors.map((person) => ({ value: person.id, label: person.name })),
            ]}
          />
        </Box>
        {mode === 'create' ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {`Fee due date is recorded as ${formatDate(NEW_CADET_FEE_DUE_DATE)} by the current enrolment rule. That date is fixed in the save action and is not calculated.`}
          </Alert>
        ) : null}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3 }}>
          <Button type="submit" variant="contained" color="accent" disabled={save.isPending}>
            Save cadet
          </Button>
          <Button
            component={RouterLink}
            to={cadet ? `/cadets/${cadet.id}` : '/cadets'}
            color="inherit"
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </>
  );
}
