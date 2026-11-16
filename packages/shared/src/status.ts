import { z } from 'zod';

export const APP_STATUSES = [
  'applied',
  'oa',
  'interview',
  'offer',
  'ghosted',
  'rejected',
] as const;

export const AppStatusSchema = z.enum(APP_STATUSES);

export type AppStatus = z.infer<typeof AppStatusSchema>;

/** Statuses an application can move through automatically, earliest first. */
export const FORWARD_STATUS_ORDER = [
  'applied',
  'oa',
  'interview',
  'offer',
] as const satisfies readonly AppStatus[];

const OPEN_FOR_REJECTION = new Set<AppStatus>(FORWARD_STATUS_ORDER);

/**
 * Whether an automatic update may change `from` to `to`.
 * Forward moves skip steps (applied → interview) and never go backward.
 * `rejected` can replace any open status. `ghosted` is reserved for the cron.
 */
export function canAutoAdvance(from: AppStatus, to: AppStatus): boolean {
  if (from === to) return false;
  if (to === 'rejected') return OPEN_FOR_REJECTION.has(from);

  const fromIndex = FORWARD_STATUS_ORDER.indexOf(from as (typeof FORWARD_STATUS_ORDER)[number]);
  const toIndex = FORWARD_STATUS_ORDER.indexOf(to as (typeof FORWARD_STATUS_ORDER)[number]);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex > fromIndex;
}

/** Row color follows the status itself. */
export type ApplicationRowTone = AppStatus;

export function applicationRowTone(
  status: AppStatus,
  _notes?: string | null,
): ApplicationRowTone {
  return status;
}
