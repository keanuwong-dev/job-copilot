import { parse } from 'yaml';
import { z } from 'zod';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
const blankOrYearMonth = z.union([z.literal(''), yearMonth]);
const experienceEnd = z.union([z.literal(''), z.literal('present'), yearMonth]);

function yamlText<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (typeof value === 'number' ? String(value) : value), schema);
}

const blankOrEmail = z.union([z.literal(''), z.email()]);

export const ProfileSchema = z.strictObject({
  personal: z.strictObject({
    first_name: z.string(),
    last_name: z.string(),
    preferred_name: z.string(),
    email: blankOrEmail,
    phone: z.string(),
    address_line1: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
  }),
  links: z.strictObject({
    linkedin: z.string(),
    github: z.string(),
    portfolio: z.string(),
    website: z.string(),
  }),
  work_auth: z.strictObject({
    authorized_us: z.boolean(),
    needs_sponsorship_now: z.boolean(),
    needs_sponsorship_future: z.boolean(),
  }),
  education: z.array(
    z.strictObject({
      school: z.string(),
      degree: z.string(),
      major: z.string(),
      gpa: yamlText(z.string()),
      start: blankOrYearMonth,
      end: blankOrYearMonth,
    }),
  ),
  experience: z.array(
    z.strictObject({
      company: z.string(),
      title: z.string(),
      location: z.string(),
      start: blankOrYearMonth,
      end: experienceEnd,
      summary: z.string(),
    }),
  ),
  preferences: z.strictObject({
    desired_salary: yamlText(z.string()),
    earliest_start_date: z.string(),
    willing_to_relocate: z.boolean(),
    remote_preference: z.union([z.literal(''), z.enum(['remote', 'hybrid', 'onsite', 'any'])]),
  }),
  eeo: z.strictObject({
    gender: z.string().min(1),
    race_ethnicity: z.string().min(1),
    hispanic_latino: z.string().min(1),
    veteran_status: z.string().min(1),
    disability_status: z.string().min(1),
  }),
  common_answers: z.strictObject({
    how_did_you_hear: z.string(),
    cover_letter_default: z.string(),
  }),
  resume_path: z.string(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export function parseProfileYaml(source: string): Profile {
  const parsed: unknown = parse(source);
  return ProfileSchema.parse(parsed);
}
