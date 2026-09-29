import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '../../components/data/EmptyState';
import { AppSelect } from '../../components/forms/AppSelect';
import { PageHeader } from '../../components/data/PageHeader';
import { StatusChip } from '../../components/data/StatusChip';
import { useConfirm } from '../../components/feedback/confirm';
import { useSnackbar } from '../../components/feedback/snackbar';
import type { Course, Syllabus, SyllabusPhase } from '../../domain/workspace';
import { useWorkspaceRepository } from '../../services/repositories/WorkspaceRepositoryProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { SYLLABUS_ITEM_TYPES, publishedGroundAndKnowledge } from './trainingRules';
import { trainingQueryKeys, useSyllabusQuery } from './trainingQueries';

export function SyllabusPage() {
  const query = useSyllabusQuery();
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: trainingQueryKeys.all });
    await queryClient.invalidateQueries({ queryKey: ['cadets'] });
    await queryClient.invalidateQueries({ queryKey: ['cadet'] });
  };

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Syllabus" subtitle="Publishing stores a demo version. It is not regulatory approval." />
        <CircularProgress aria-label="Loading syllabi" sx={{ color: 'primary.main' }} />
      </>
    );
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Syllabus" subtitle="The syllabus register could not be read." />
        <EmptyState
          title="The syllabus register did not load"
          body="The demonstration records could not be read. You can try again."
          action={<Button variant="contained" color="accent" onClick={() => { void query.refetch(); }}>Try again</Button>}
        />
      </>
    );
  }

  const { courses, syllabi } = query.data;
  const lessons = publishedGroundAndKnowledge(syllabi);

  return (
    <>
      <PageHeader
        title="Syllabus"
        subtitle="Publishing stores a demo version. It is not regulatory approval. Existing cadet assignments stay on their version."
      />
      {syllabi.length === 0 ? (
        <EmptyState title="No syllabi are in this workspace" body="Syllabus versions are read from the academy workspace." />
      ) : syllabi.map((syllabus) => (
        <SyllabusCard
          key={syllabus.id}
          syllabus={syllabus}
          course={courses.find((item) => item.id === syllabus.courseId)}
          onChanged={refresh}
        />
      ))}
      {syllabi.length > 0 ? (
        <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, p: { xs: 2, sm: 3 } }}>
          <Typography sx={{ fontWeight: 600, color: tokens.navy }}>Published knowledge and ground lessons</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
            Published knowledge items and ground lessons. No files are attached.
          </Typography>
          {lessons.length === 0 ? (
            <Typography variant="body2" color="text.secondary">None are on a published syllabus.</Typography>
          ) : (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {lessons.map((name) => <li key={name}><Typography variant="body2">{name}</Typography></li>)}
            </Box>
          )}
        </Box>
      ) : null}
    </>
  );
}

function SyllabusCard({
  syllabus,
  course,
  onChanged,
}: {
  syllabus: Syllabus;
  course: Course | undefined;
  onChanged: () => Promise<void>;
}) {
  const { can, user } = useAuth();
  const repository = useWorkspaceRepository();
  const confirm = useConfirm();
  const { notify } = useSnackbar();
  const editable = syllabus.status === 'Draft' && can('training.configure');
  const [phaseName, setPhaseName] = useState('');
  const [phaseError, setPhaseError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const addPhase = async (event: FormEvent) => {
    event.preventDefault();
    const name = phaseName.trim();
    if (!name) {
      setPhaseError('Phase name is required.');
      return;
    }
    setBusy(true);
    const result = await repository.addSyllabusPhase(syllabus.id, name, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setPhaseError(result.error);
      return;
    }
    setPhaseName('');
    setPhaseError('');
    setError('');
    await onChanged();
  };

  const publish = async () => {
    const accepted = await confirm({
      title: 'Publish syllabus version',
      body: 'Cadets already assigned keep their current version until someone edits the profile.',
      confirmLabel: 'Publish',
    });
    if (!accepted) return;
    setBusy(true);
    const result = await repository.publishSyllabus(syllabus.id, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    notify('Syllabus published.');
    await onChanged();
  };

  return (
    <Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: 3, bgcolor: tokens.surface, mb: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', px: { xs: 2, sm: 3 }, py: 1.5, borderBottom: `1px solid ${tokens.line}` }}>
        <Box>
          <Typography component="h2" sx={{ fontWeight: 600, color: tokens.navy }}>{syllabus.label}</Typography>
          {course ? <Typography variant="body2" color="text.secondary">{course.name}</Typography> : null}
        </Box>
        <StatusChip status={syllabus.status} />
      </Box>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {syllabus.phases.map((phase) => (
          <PhaseBlock key={phase.id} syllabusId={syllabus.id} phase={phase} editable={editable} onChanged={onChanged} />
        ))}
        {editable ? (
          <>
            <Box component="form" onSubmit={(event) => { void addPhase(event); }} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <TextField
                label="Phase name"
                value={phaseName}
                onChange={(event) => setPhaseName(event.target.value)}
                error={Boolean(phaseError)}
                helperText={phaseError}
                sx={{ flex: '1 1 220px' }}
              />
              <Button type="submit" color="inherit" disabled={busy} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>Add phase</Button>
            </Box>
            <Button variant="contained" color="accent" onClick={() => { void publish(); }} disabled={busy}>Publish version</Button>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Illustrative structure. Not an approved syllabus. Existing cadet assignments stay on their version.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function PhaseBlock({
  syllabusId,
  phase,
  editable,
  onChanged,
}: {
  syllabusId: string;
  phase: SyllabusPhase;
  editable: boolean;
  onChanged: () => Promise<void>;
}) {
  const { user } = useAuth();
  const repository = useWorkspaceRepository();
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<string>(SYLLABUS_ITEM_TYPES[0]);
  const [itemError, setItemError] = useState('');
  const [moveError, setMoveError] = useState('');
  const [busy, setBusy] = useState(false);

  const addItem = async (event: FormEvent) => {
    event.preventDefault();
    const name = itemName.trim();
    if (!name) {
      setItemError('Item name is required.');
      return;
    }
    setBusy(true);
    const result = await repository.addSyllabusItem(syllabusId, phase.id, { name, type: itemType }, user ?? undefined);
    setBusy(false);
    if (!result.ok) {
      setItemError(result.error);
      return;
    }
    setItemName('');
    setItemError('');
    setMoveError('');
    await onChanged();
  };

  const move = async (itemId: string, direction: number) => {
    setBusy(true);
    const result = await repository.moveSyllabusItem(syllabusId, phase.id, itemId, direction);
    setBusy(false);
    if (!result.ok) {
      setMoveError(result.error);
      return;
    }
    setMoveError('');
    await onChanged();
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>{phase.name}</Typography>
      <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
        {phase.items.map((item) => (
          <li key={item.id}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', py: 0.25 }}>
              <Typography variant="body2">{item.name}</Typography>
              <Typography variant="body2" color="text.secondary">{item.type}</Typography>
              {editable ? (
                <>
                  <Button size="small" color="inherit" disabled={busy} aria-label={`Move ${item.name} up`} onClick={() => { void move(item.id, -1); }}>Up</Button>
                  <Button size="small" color="inherit" disabled={busy} aria-label={`Move ${item.name} down`} onClick={() => { void move(item.id, 1); }}>Down</Button>
                </>
              ) : null}
            </Box>
          </li>
        ))}
      </Box>
      {moveError ? <Alert severity="error" sx={{ mt: 1 }}>{moveError}</Alert> : null}
      {editable ? (
        <Box component="form" onSubmit={(event) => { void addItem(event); }} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          <TextField
            label="Item name"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            error={Boolean(itemError)}
            helperText={itemError}
            sx={{ flex: '1 1 180px' }}
          />
          <AppSelect
            label="Item type"
            value={itemType}
            onChange={setItemType}
            sx={{ flex: '1 1 180px' }}
            options={SYLLABUS_ITEM_TYPES.map((type) => ({ value: type, label: type }))}
          />
          <Button type="submit" color="inherit" disabled={busy} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>Add item</Button>
        </Box>
      ) : null}
    </Box>
  );
}
