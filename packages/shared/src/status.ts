import { z } from 'zod';

export const APP_STATUSES = [
  'saved',
  'applied',
  'oa',
  'interview',
  'offer',
  'rejected',
  'ghosted',
  'withdrawn',
] as const;

export const AppStatusSchema = z.enum(APP_STATUSES);

export type AppStatus = z.infer<typeof AppStatusSchema>;

/** Statuses an application can move through automatically, earliest first. */
export const FORWARD_STATUS_ORDER = [
  'saved',
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

/** How a tracker row should read: still open, a live next step, interview, or over. */
export type ApplicationRowTone = 'open' | 'live' | 'plain' | 'closed';

const CLOSED_STATUSES = new Set<AppStatus>(['rejected', 'ghosted', 'withdrawn']);
const LIVE_STATUSES = new Set<AppStatus>(['oa', 'offer']);

const LIVE_NOTE =
  /\b(?:coffee\s+chats?|interviews?|next\s+rounds?|(?:1st|2nd|3rd|first|second|third|final)\s+rounds?|rounds?\s+[2-9]|onsites?|on-sites?|phone\s+screens?|recruiter\s+(?:screens?|calls?|chats?)|super\s*days?|take[\s-]?homes?|online\s+assessments?|hiring\s+managers?)\b/i;

/**
 * Closed statuses win even if the notes still mention an old interview.
 * Saved and applied stay open unless the notes name a live next step.
 */
export function applicationRowTone(
  status: AppStatus,
  notes: string | null | undefined,
): ApplicationRowTone {
  if (CLOSED_STATUSES.has(status)) return 'closed';
  if (status === 'interview') return 'plain';
  if (LIVE_STATUSES.has(status)) return 'live';
  if (notes && LIVE_NOTE.test(notes)) return 'live';
  return 'open';
}
