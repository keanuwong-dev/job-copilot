import type { AppStatus, Platform } from '@job-tracker/shared';
import { PLATFORMS } from '@job-tracker/shared';

const menu = (background: string, hover: string, text: string) =>
  `${background} ${text} ${hover} focus:${hover.replace('hover:', '')} focus:${text} focus:**:${text} [&_svg]:text-current`;

const APPLIED_MENU = menu(
  'bg-[#cfe2f3]',
  'hover:bg-[#bcd4ea]',
  'text-[#202124]',
);
const ACTIVE_MENU = menu('bg-[#ffe599]', 'hover:bg-[#f1c232]', 'text-[#202124]');
const OFFER_MENU = menu('bg-[#93c47d]', 'hover:bg-[#7fba68]', 'text-[#202124]');
const GHOSTED_MENU = menu('bg-[#5f6368]', 'hover:bg-[#4a4e52]', 'text-white');
const REJECTED_MENU = menu('bg-[#e06666]', 'hover:bg-[#cc4125]', 'text-white');

/** Menu color for a status, matching the tracker row it produces. */
export const STATUS_OPTION_CLASS: Record<AppStatus, string> = {
  applied: APPLIED_MENU,
  oa: ACTIVE_MENU,
  interview: ACTIVE_MENU,
  offer: OFFER_MENU,
  ghosted: GHOSTED_MENU,
  rejected: REJECTED_MENU,
};

const row = (background: string, hover: string, text: string, link: string) =>
  `${background} ${text} ${hover} ${link}`;

/** Sheet color for a tracker row. */
export const STATUS_ROW_CLASS: Record<AppStatus, string> = {
  applied: row(
    'bg-[#cfe2f3]',
    'group-hover:bg-[#bcd4ea]',
    'text-[#202124]',
    '[&_a]:text-[#1155cc]',
  ),
  oa: row(
    'bg-[#ffe599]',
    'group-hover:bg-[#f1c232]',
    'text-[#202124]',
    '[&_a]:text-[#1155cc]',
  ),
  interview: row(
    'bg-[#ffe599]',
    'group-hover:bg-[#f1c232]',
    'text-[#202124]',
    '[&_a]:text-[#1155cc]',
  ),
  offer: row(
    'bg-[#93c47d]',
    'group-hover:bg-[#7fba68]',
    'text-[#202124]',
    '[&_a]:text-[#1155cc]',
  ),
  ghosted: row(
    'bg-[#5f6368]',
    'group-hover:bg-[#4a4e52]',
    'text-white',
    '[&_a]:text-white [&_svg]:text-white',
  ),
  rejected: row(
    'bg-[#e06666]',
    'group-hover:bg-[#cc4125]',
    'text-white',
    '[&_a]:text-white [&_svg]:text-white',
  ),
};

export const STATUS_LABELS: Record<AppStatus, string> = {
  applied: 'Applied',
  oa: 'OA',
  interview: 'Interview',
  offer: 'Offer',
  ghosted: 'Ghosted',
  rejected: 'Rejected',
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
