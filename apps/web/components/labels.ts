import type { AppStatus, Platform } from '@job-tracker/shared';
import { PLATFORMS } from '@job-tracker/shared';

const OPEN_STATUS =
  'bg-[#cfe2f3] text-[#202124] focus:bg-[#bcd4ea] focus:text-[#202124] focus:**:text-[#202124] [&_svg]:text-current';
const LIVE_STATUS =
  'bg-[#93c47d] text-[#202124] focus:bg-[#7fba68] focus:text-[#202124] focus:**:text-[#202124] [&_svg]:text-current';
const CLOSED_STATUS =
  'bg-[#5f6368] text-white focus:bg-[#4a4e52] focus:text-white focus:**:text-white [&_svg]:text-current';
const PLAIN_STATUS =
  'bg-white text-black focus:bg-neutral-100 focus:text-black focus:**:text-black [&_svg]:text-current';

/** Menu color for a status, matching the tracker row it produces. */
export const STATUS_OPTION_CLASS: Record<AppStatus, string> = {
  saved: OPEN_STATUS,
  applied: OPEN_STATUS,
  oa: LIVE_STATUS,
  interview: PLAIN_STATUS,
  offer: LIVE_STATUS,
  rejected: CLOSED_STATUS,
  ghosted: CLOSED_STATUS,
  withdrawn: CLOSED_STATUS,
};

export const STATUS_LABELS: Record<AppStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  oa: 'OA',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
  withdrawn: 'Withdrawn',
};

export const TIER_LABELS = {
  reach: 'Reach',
  target: 'Target',
  volume: 'Volume',
} as const;

export const PLATFORM_LABELS: Record<Platform, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  workday: 'Workday',
  other: 'Other',
};

export function platformLabel(value: string | null): string {
  if (!value) return '—';
  return PLATFORMS.includes(value as Platform) ? PLATFORM_LABELS[value as Platform] : value;
}

export function formatWhen(value: string | null): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return '—';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}
