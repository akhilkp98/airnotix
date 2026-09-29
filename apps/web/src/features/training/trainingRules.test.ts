import { describe, expect, it } from 'vitest';
import { createWorkspaceFixture } from '../../domain/fixtures';
import { filterProgressCadets, publishedGroundAndKnowledge, validateAssessment } from './trainingRules';

describe('training rules', () => {
  const fixture = createWorkspaceFixture();

  it('keeps the prototype assessment message and ground-lesson list', () => {
    expect(validateAssessment({ cadetId: '', itemId: '', outcome: '' }).message).toBe('Cadet, training item, and outcome are required.');
    expect(validateAssessment({ cadetId: 'cadet-aarav', itemId: 'item-stall', outcome: 'Satisfactory' }).ok).toBe(true);
    expect(publishedGroundAndKnowledge(fixture.syllabi)).toEqual([
      'Air law briefing',
      'Meteorology classroom',
      'Navigation theory',
      'Principles of flight',
      'Pre-flight briefing',
    ]);
    expect(filterProgressCadets(fixture.cadets, 'neil').map((cadet) => cadet.id)).toEqual(['cadet-neil']);
  });
});
