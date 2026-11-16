import { normalizeLabel } from './normalize';

export const ANSWER_CATEGORIES = [
  'Logistics',
  'Why you',
  'By role',
  'Projects',
  'Behavior',
  'Other',
] as const;

export type AnswerCategory = (typeof ANSWER_CATEGORIES)[number];

const RULES: ReadonlyArray<readonly [AnswerCategory, readonly string[]]> = [
  [
    'By role',
    [
      'product analyst',
      'data analyst',
      'data scientist',
      'associate product manager',
      'solutions engineer',
      'software engineer',
    ],
  ],
  [
    'Logistics',
    [
      'graduat',
      'start date',
      'full time',
      'internship',
      'authorized to work',
      'visa',
      'sponsorship',
      'relocat',
      'work location',
      'salary',
      'how did you hear',
      'portfolio',
      'github',
      'linkedin',
      'website',
    ],
  ],
  [
    'Why you',
    [
      'about yourself',
      'this company',
      'startup',
      'tech ai',
      'five years',
      'why should we hire',
      'anything else',
    ],
  ],
  [
    'Projects',
    [
      'proud of',
      'technical project',
      'experience with ai',
      'experience with sql',
      'experience with python',
      'built from zero',
      'product you built',
    ],
  ],
  [
    'Behavior',
    [
      'tell me about a time',
      'a time you',
      'ambiguity',
      'strength',
      'weakness',
      'ideal team',
      'priorit',
      'improve a product',
      'other roles',
      'fit for both',
    ],
  ],
];

/** Groups a free-text application question into the answer-bank sections. */
export function answerCategory(question: string): AnswerCategory {
  const normalized = normalizeLabel(question);
  if (!normalized) return 'Other';
  for (const [category, phrases] of RULES) {
    if (phrases.some((phrase) => normalized.includes(phrase))) return category;
  }
  return 'Other';
}
