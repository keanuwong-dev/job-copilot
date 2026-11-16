import { z } from 'zod';
import type { AppStatus } from './status';
import { AppStatusSchema } from './status';

export const PLATFORMS = ['greenhouse', 'lever', 'ashby', 'workday', 'other'] as const;

export const TIERS = ['reach', 'target', 'volume'] as const;

export const TierSchema = z.enum(TIERS);

export type Tier = z.infer<typeof TierSchema>;

export const PlatformSchema = z.enum(PLATFORMS);

export type Platform = z.infer<typeof PlatformSchema>;

const RESPONSE_STATUSES = new Set<AppStatus>(['oa', 'interview', 'offer', 'rejected']);

export type ApplicationStatInput = {
  status: AppStatus;
  applied_at: string | null;
  created_at: string;
};

export type ApplicationStats = {
  totalApplied: number;
  appliedThisWeek: number;
  /** Null when nothing has been applied yet. */
  responseRate: number | null;
  interviews: number;
  offers: number;
};

export function applicationStats(
  applications: readonly ApplicationStatInput[],
  now = new Date(),
): ApplicationStats {
  const applied = applications.filter((item) => item.status !== 'saved');
  const weekStart = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const appliedThisWeek = applied.filter((item) => {
    const stamp = Date.parse(item.applied_at ?? item.created_at);
    return !Number.isNaN(stamp) && stamp >= weekStart;
  }).length;
  const responses = applied.filter((item) => RESPONSE_STATUSES.has(item.status)).length;

  return {
    totalApplied: applied.length,
    appliedThisWeek,
    responseRate: applied.length === 0 ? null : responses / applied.length,
    interviews: applications.filter(
      (item) => item.status === 'interview' || item.status === 'offer',
    ).length,
    offers: applications.filter((item) => item.status === 'offer').length,
  };
}

function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export const ApplicationWriteSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(200),
  role: z.string().trim().min(1, 'Role is required').max(200),
  company_domain: z.string().trim().max(200).nullish(),
  job_url: z.string().trim().max(2000).nullish(),
  platform: z.union([PlatformSchema, z.literal('')]).nullish(),
  location: z.string().trim().max(200).nullish(),
  status: AppStatusSchema.optional(),
  applied_at: z.string().trim().nullish(),
  salary_range: z.string().trim().max(200).nullish(),
  notes: z.string().max(10000).nullish(),
  tier: z.union([TierSchema, z.literal('')]).nullish(),
});

export type ApplicationWrite = {
  company: string;
  role: string;
  company_domain: string | null;
  job_url: string | null;
  platform: Platform | null;
  location: string | null;
  status?: AppStatus;
  applied_at: string | null;
  salary_range: string | null;
  notes: string | null;
  tier: Tier | null;
};

export type ApplicationParseResult =
  { ok: true; value: ApplicationWrite } | { ok: false; error: string };

function normalizeAppliedAt(
  value: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null || value === '') return { ok: true, value: null };
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00.000Z` : value;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return { ok: false, error: 'Applied date is invalid' };
  return { ok: true, value: new Date(time).toISOString() };
}

export function parseApplicationWrite(input: unknown): ApplicationParseResult {
  const parsed = ApplicationWriteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid application' };
  }

  const appliedAt = normalizeAppliedAt(parsed.data.applied_at);
  if (!appliedAt.ok) return appliedAt;

  const platform = parsed.data.platform ? parsed.data.platform : null;

  return {
    ok: true,
    value: {
      company: parsed.data.company,
      role: parsed.data.role,
      company_domain: blankToNull(parsed.data.company_domain),
      job_url: blankToNull(parsed.data.job_url),
      platform,
      location: blankToNull(parsed.data.location),
      status: parsed.data.status,
      applied_at: appliedAt.value,
      salary_range: blankToNull(parsed.data.salary_range),
      notes: blankToNull(parsed.data.notes),
      tier: parsed.data.tier ? parsed.data.tier : null,
    },
  };
}

export type ApplicationInsertFields = {
  user_id: string;
  company: string;
  role: string;
  company_domain: string | null;
  job_url: string | null;
  platform: string | null;
  location: string | null;
  status: AppStatus;
  applied_at: string | null;
  salary_range: string | null;
  notes: string | null;
  tier: Tier | null;
  last_activity_at: string;
};

export function buildApplicationInsert(
  userId: string,
  input: ApplicationWrite,
  now = new Date(),
): ApplicationInsertFields {
  const status = input.status ?? 'applied';
  return {
    user_id: userId,
    company: input.company,
    role: input.role,
    company_domain: input.company_domain,
    job_url: input.job_url,
    platform: input.platform,
    location: input.location,
    status,
    applied_at: input.applied_at ?? (status === 'saved' ? null : now.toISOString()),
    salary_range: input.salary_range,
    notes: input.notes,
    tier: input.tier,
    last_activity_at: now.toISOString(),
  };
}
