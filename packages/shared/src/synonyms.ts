import { normalizeLabel } from './normalize';

/** Label-mapped profile paths. `work_auth.needs_sponsorship` is the unspecified now/future question. */
export const PROFILE_FIELDS = [
  'personal.first_name',
  'personal.last_name',
  'personal.preferred_name',
  'personal.email',
  'personal.phone',
  'personal.address_line1',
  'personal.city',
  'personal.state',
  'personal.zip',
  'personal.country',
  'links.linkedin',
  'links.github',
  'links.portfolio',
  'links.website',
  'work_auth.authorized_us',
  'work_auth.needs_sponsorship',
  'work_auth.needs_sponsorship_now',
  'work_auth.needs_sponsorship_future',
  'education.school',
  'education.degree',
  'education.major',
  'education.gpa',
  'education.start',
  'education.end',
  'experience.company',
  'experience.title',
  'experience.location',
  'experience.start',
  'experience.end',
  'preferences.desired_salary',
  'preferences.earliest_start_date',
  'preferences.willing_to_relocate',
  'preferences.remote_preference',
  'eeo.gender',
  'eeo.race_ethnicity',
  'eeo.hispanic_latino',
  'eeo.veteran_status',
  'eeo.disability_status',
  'common_answers.how_did_you_hear',
  'common_answers.cover_letter_default',
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const SYNONYMS = [
  { field: 'personal.first_name', phrases: ['first name', 'given name', 'legal first name'] },
  { field: 'personal.last_name', phrases: ['last name', 'surname', 'family name'] },
  { field: 'personal.preferred_name', phrases: ['preferred name', 'nickname'] },
  { field: 'personal.email', phrases: ['email', 'email address', 'e mail'] },
  { field: 'personal.phone', phrases: ['phone', 'phone number', 'mobile', 'mobile phone'] },
  {
    field: 'personal.address_line1',
    phrases: ['address', 'street address', 'address line 1'],
  },
  { field: 'personal.city', phrases: ['city'] },
  { field: 'personal.state', phrases: ['state', 'province'] },
  { field: 'personal.zip', phrases: ['zip', 'zip code', 'postal code'] },
  { field: 'personal.country', phrases: ['country'] },
  {
    field: 'links.linkedin',
    phrases: ['linkedin', 'linkedin profile', 'linkedin url', 'linkedin profile url'],
  },
  { field: 'links.github', phrases: ['github', 'github profile', 'github url'] },
  { field: 'links.portfolio', phrases: ['portfolio', 'portfolio url'] },
  { field: 'links.website', phrases: ['website', 'personal website'] },
  {
    field: 'work_auth.authorized_us',
    phrases: ['authorized to work', 'legally authorized', 'legally authorized to work'],
  },
  {
    field: 'work_auth.needs_sponsorship',
    phrases: ['sponsorship', 'visa', 'visa sponsorship'],
  },
  {
    field: 'work_auth.needs_sponsorship_now',
    phrases: ['require sponsorship now', 'currently require sponsorship'],
  },
  {
    field: 'work_auth.needs_sponsorship_future',
    phrases: ['future sponsorship', 'require sponsorship in the future'],
  },
  { field: 'education.school', phrases: ['school', 'university', 'college'] },
  { field: 'education.degree', phrases: ['degree'] },
  { field: 'education.major', phrases: ['major', 'field of study'] },
  { field: 'education.gpa', phrases: ['gpa', 'grade point average'] },
  { field: 'education.start', phrases: ['education start', 'school start date'] },
  { field: 'education.end', phrases: ['graduation date', 'education end'] },
  { field: 'experience.company', phrases: ['company', 'employer'] },
  { field: 'experience.title', phrases: ['job title'] },
  { field: 'experience.location', phrases: ['job location', 'office location'] },
  { field: 'experience.start', phrases: ['employment start date'] },
  { field: 'experience.end', phrases: ['employment end date'] },
  {
    field: 'preferences.desired_salary',
    phrases: ['desired salary', 'salary expectation', 'salary expectations'],
  },
  {
    field: 'preferences.earliest_start_date',
    phrases: ['earliest start date', 'available start date'],
  },
  { field: 'preferences.willing_to_relocate', phrases: ['willing to relocate'] },
  { field: 'preferences.remote_preference', phrases: ['remote preference'] },
  { field: 'eeo.gender', phrases: ['gender'] },
  { field: 'eeo.race_ethnicity', phrases: ['race', 'ethnicity', 'race ethnicity'] },
  { field: 'eeo.hispanic_latino', phrases: ['hispanic', 'latino', 'hispanic or latino'] },
  { field: 'eeo.veteran_status', phrases: ['veteran', 'veteran status'] },
  { field: 'eeo.disability_status', phrases: ['disability', 'disability status'] },
  {
    field: 'common_answers.how_did_you_hear',
    phrases: [
      'how did you hear',
      'how did you hear about us',
      'how did you hear about this job',
      'how did you hear about this position',
    ],
  },
  { field: 'common_answers.cover_letter_default', phrases: ['cover letter'] },
] as const satisfies readonly { field: ProfileField; phrases: readonly string[] }[];

const PHRASE_TO_FIELD = new Map<string, ProfileField>();

for (const entry of SYNONYMS) {
  for (const phrase of entry.phrases) {
    const normalized = normalizeLabel(phrase);
    if (PHRASE_TO_FIELD.has(normalized)) {
      throw new Error(`Duplicate synonym phrase: ${normalized}`);
    }
    PHRASE_TO_FIELD.set(normalized, entry.field);
  }
}

/** Exact match of a normalized field label. Unknown or ambiguous labels return null. */
export function matchSynonym(label: string): ProfileField | null {
  const normalized = normalizeLabel(label);
  if (!normalized) return null;
  return PHRASE_TO_FIELD.get(normalized) ?? null;
}
