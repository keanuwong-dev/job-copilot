import { z } from 'zod';
import { normalizeLabel } from './normalize';
import { RULE_CONFIDENCE, type Classification } from './classify';
import { FORWARD_STATUS_ORDER, type AppStatus } from './status';

export const GHOSTED_AFTER_DAYS = 30;
export const INBOUND_EMAIL_BATCH = 25;

const OPEN_STATUSES = new Set<AppStatus>(FORWARD_STATUS_ORDER);

const COMPANY_PATTERNS = [
  /thank you for applying to\s+([A-Za-z0-9&.'’-]{2,}(?:\s+[A-Za-z0-9&.'’-]{2,}){0,3})/i,
  /received your application (?:to|at)\s+([A-Za-z0-9&.'’-]{2,}(?:\s+[A-Za-z0-9&.'’-]{2,}){0,3})/i,
  /application (?:to|at)\s+([A-Za-z0-9&.'’-]{2,}(?:\s+[A-Za-z0-9&.'’-]{2,}){0,3})/i,
  /applying to\s+([A-Za-z0-9&.'’-]{2,}(?:\s+[A-Za-z0-9&.'’-]{2,}){0,3})/i,
];

export const InboundEmailSchema = z.object({
  gmail_message_id: z.string().trim().min(1).max(128),
  from: z.string().trim().max(500).optional().default(''),
  subject: z.string().trim().max(500).optional().default(''),
  snippet: z.string().max(1000).optional().default(''),
  body: z.string().max(4000).optional().default(''),
  received_at: z.string().trim().min(1).max(40),
});

export const InboundBatchSchema = z.object({
  messages: z.array(InboundEmailSchema).min(1).max(INBOUND_EMAIL_BATCH),
});

export type InboundEmail = z.infer<typeof InboundEmailSchema>;

export type MatchCandidate = {
  id: string;
  company: string;
  company_domain: string | null;
  role: string;
  status: AppStatus;
  last_activity_at: string;
};

export type EmailMatchInput = {
  from: string;
  subject: string;
  body: string;
};

/** Picks one open application, or null when the email is ambiguous or unknown. */
export function matchApplication(
  email: EmailMatchInput,
  applications: readonly MatchCandidate[],
): MatchCandidate | null {
  const haystack = normalizeLabel(`${email.subject}\n${email.body}`);
  const domain = senderDomain(email.from);
  const mentioned = companiesMentioned(`${email.subject}\n${email.body}`);
  const open = applications.filter((application) => OPEN_STATUSES.has(application.status));

  const companyMatches = open.filter((application) => {
    if (domain && domainMatches(domain, application.company_domain)) return true;
    const company = normalizeLabel(application.company);
    if (company.length >= 3 && haystack.includes(company)) return true;
    return mentioned.some((name) => name === company);
  });

  if (companyMatches.length === 0) return null;
  if (companyMatches.length === 1) return companyMatches[0] ?? null;

  const roleMatches = companyMatches.filter((application) => {
    const role = normalizeLabel(application.role);
    return role.length >= 3 && haystack.includes(role);
  });
  const pool = roleMatches.length > 0 ? roleMatches : [];
  if (pool.length === 0) return null;
  return [...pool].sort((left, right) => right.last_activity_at.localeCompare(left.last_activity_at))[0] ?? null;
}

/** Confident, matched mail can update status. Everything else waits in Review. */
export function shouldAutoApply(classification: Classification, matched: boolean): boolean {
  return matched && classification.confidence >= RULE_CONFIDENCE && classification.status != null;
}

export function isGhostedCandidate(
  status: AppStatus,
  lastActivityAt: string,
  now: Date,
  days = GHOSTED_AFTER_DAYS,
): boolean {
  if (status !== 'applied' && status !== 'oa') return false;
  const then = Date.parse(lastActivityAt);
  if (Number.isNaN(then)) return false;
  return now.getTime() - then >= days * 24 * 60 * 60 * 1000;
}

function senderDomain(from: string): string | null {
  const match = /([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-z]{2,})/i.exec(from);
  return match?.[2]?.toLowerCase() ?? null;
}

function domainMatches(sender: string, companyDomain: string | null): boolean {
  if (!companyDomain) return false;
  const domain = companyDomain.trim().toLowerCase().replace(/^@/, '');
  if (!domain || domain.includes(' ')) return false;
  return sender === domain || sender.endsWith(`.${domain}`);
}

function companiesMentioned(text: string): string[] {
  const names: string[] = [];
  for (const pattern of COMPANY_PATTERNS) {
    const match = pattern.exec(text);
    const name = match?.[1]?.replace(/[.,;:]+$/, '').trim();
    if (!name) continue;
    const normalized = normalizeLabel(name);
    if (normalized.length >= 3) names.push(normalized);
  }
  return names;
}
