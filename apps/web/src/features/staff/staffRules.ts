import { DEMO_TODAY } from '../../domain/fixtures';

/** Kinds on the prototype availability form. Leave is the first option. */
export const AVAILABILITY_KINDS = ['Leave', 'Unavailable'] as const;

/** Literal default date on the prototype availability form. */
export const DEFAULT_LEAVE_DATE = '2026-10-01';

/**
 * Same date comparison as a flight qualification warning: expires before the demo day.
 * An equal date is not a warning. This does not ground anyone.
 */
export function qualificationBeforeDemoDay(expires: string) {
  return Boolean(expires) && expires < DEMO_TODAY;
}
