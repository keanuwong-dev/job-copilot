import { z } from 'zod';
import { normalizeLabel } from './normalize';

export const AnswerSaveSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(8000),
  platform: z.string().trim().max(40).nullable().optional(),
});

export const AnswerUseSchema = z.object({
  used: z.array(z.string().trim().min(1).max(500)).min(1).max(50),
});

export type AnswerSave = z.infer<typeof AnswerSaveSchema>;

export type StoredAnswer = {
  question_normalized: string;
  answer: string;
};

const FUZZY_THRESHOLD = 0.92;

/** Exact normalized match, then a high-confidence fuzzy match. Ambiguous matches return null. */
export function matchAnswer(label: string, answers: readonly StoredAnswer[]): StoredAnswer | null {
  const normalized = normalizeLabel(label);
  if (!normalized) return null;

  const exact = answers.find((entry) => entry.question_normalized === normalized);
  if (exact) return exact;

  const ranked = answers
    .map((entry) => ({ entry, score: similarity(normalized, entry.question_normalized) }))
    .filter((item) => item.score >= FUZZY_THRESHOLD)
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  const second = ranked[1];
  if (!best) return null;
  if (second && best.score - second.score < 0.03) return null;
  return best.entry;
}

function similarity(left: string, right: string): number {
  if (!left || !right) return 0;
  const ratio = Math.min(left.length, right.length) / Math.max(left.length, right.length);
  if (ratio < 0.8) return 0;
  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  if (leftGrams.length < 2 || rightGrams.length < 2) return 0;

  const counts = new Map<string, number>();
  for (const gram of leftGrams) counts.set(gram, (counts.get(gram) ?? 0) + 1);
  let overlap = 0;
  for (const gram of rightGrams) {
    const count = counts.get(gram) ?? 0;
    if (count > 0) {
      counts.set(gram, count - 1);
      overlap += 1;
    }
  }
  return (2 * overlap) / (leftGrams.length + rightGrams.length);
}

function bigrams(value: string): string[] {
  const grams: string[] = [];
  for (let index = 0; index < value.length - 1; index += 1) {
    grams.push(value.slice(index, index + 2));
  }
  return grams;
}
