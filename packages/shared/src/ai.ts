import { z } from 'zod';
import { UNMATCHED_CONFIDENCE, type Classification } from './classify';
import { ProfileSchema, type Profile } from './profile';
import { AppStatusSchema } from './status';

const MODEL_STATUSES = ['applied', 'oa', 'interview', 'offer', 'rejected'] as const;

export const DraftRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  company: z.string().trim().max(200).optional().default(''),
  role: z.string().trim().max(200).optional().default(''),
  description: z.string().max(4000).optional().default(''),
  profile: ProfileSchema.optional(),
});

export type DraftRequest = z.infer<typeof DraftRequestSchema>;

const ModelClassificationSchema = z.object({
  status: z.enum(MODEL_STATUSES).nullable(),
  confidence: z.number().min(0).max(1),
});

/** Reads the JSON object from a model reply. Anything else stays unclassified. */
export function parseModelClassification(text: string): Classification | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let value: unknown;
  try {
    value = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const parsed = ModelClassificationSchema.safeParse(value);
  if (!parsed.success) return null;
  if (!parsed.data.status) return { status: null, confidence: UNMATCHED_CONFIDENCE };
  const status = AppStatusSchema.safeParse(parsed.data.status);
  if (!status.success) return null;
  return { status: status.data, confidence: parsed.data.confidence };
}

/** Profile text for a draft. Leaves out the local resume path. */
export function profileForDraft(profile: Profile): string {
  const { resume_path: _resumePath, ...rest } = profile;
  return JSON.stringify(rest);
}
