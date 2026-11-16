import { normalizeLabel } from './normalize';
import type { AppStatus } from './status';

export const RULE_CONFIDENCE = 0.9;
export const UNMATCHED_CONFIDENCE = 0.2;

export type Classification = {
  status: AppStatus | null;
  confidence: number;
};

/**
 * First matching group wins. Offer is before rejected, and rejected is before
 * the "thank you for applying" confirmation, because rejection mail often
 * includes that sentence.
 */
const RULES = [
  {
    status: 'offer',
    phrases: ['offer letter', 'pleased to offer', 'extend an offer'],
  },
  {
    status: 'rejected',
    phrases: [
      'unfortunately',
      'not moving forward',
      'decided to pursue other candidates',
      'will not be moving',
      'position has been filled',
    ],
  },
  {
    status: 'interview',
    phrases: [
      'schedule',
      'availability',
      'interview',
      'speak with you',
      'calendly',
      'phone screen',
      'next round',
    ],
  },
  {
    status: 'oa',
    phrases: [
      'assessment',
      'coding challenge',
      'hackerrank',
      'codesignal',
      'codility',
      'take-home',
    ],
  },
  {
    status: 'applied',
    phrases: ['thank you for applying', 'received your application', 'application received'],
  },
] as const satisfies readonly { status: AppStatus; phrases: readonly string[] }[];

export function classifyEmail(input: { subject: string; body?: string }): Classification {
  const haystack = normalizeLabel(`${input.subject}\n${input.body ?? ''}`);
  for (const rule of RULES) {
    const matched = rule.phrases.some((phrase) => haystack.includes(normalizeLabel(phrase)));
    if (matched) return { status: rule.status, confidence: RULE_CONFIDENCE };
  }
  return { status: null, confidence: UNMATCHED_CONFIDENCE };
}
