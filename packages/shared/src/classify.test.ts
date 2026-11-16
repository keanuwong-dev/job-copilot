import { describe, expect, it } from 'vitest';
import { RULE_CONFIDENCE, UNMATCHED_CONFIDENCE, classifyEmail } from './classify';
import type { AppStatus } from './status';

const samples: {
  name: string;
  subject: string;
  body: string;
  status: AppStatus | null;
}[] = [
  {
    name: 'offer letter',
    subject: 'Offer letter',
    body: 'Please find your offer letter attached.',
    status: 'offer',
  },
  {
    name: 'pleased to offer',
    subject: 'Acme',
    body: 'We are pleased to offer you the role of engineer.',
    status: 'offer',
  },
  {
    name: 'extend an offer',
    subject: 'Next steps',
    body: 'We would like to extend an offer for the role.',
    status: 'offer',
  },
  {
    name: 'offer wins over interview wording',
    subject: 'Great news',
    body: 'We are pleased to offer you the role. We enjoyed the interview.',
    status: 'offer',
  },
  {
    name: 'benefits copy is not an offer',
    subject: 'Benefits',
    body: 'We offer competitive pay and equity.',
    status: null,
  },
  {
    name: 'unfortunately',
    subject: 'Update on your application',
    body: 'Unfortunately we cannot proceed.',
    status: 'rejected',
  },
  {
    name: 'not moving forward',
    subject: 'Your application',
    body: 'We are not moving forward with your candidacy.',
    status: 'rejected',
  },
  {
    name: 'other candidates',
    subject: 'Application update',
    body: 'We have decided to pursue other candidates.',
    status: 'rejected',
  },
  {
    name: 'will not be moving',
    subject: 'Update',
    body: 'We will not be moving ahead with your application.',
    status: 'rejected',
  },
  {
    name: 'position filled',
    subject: 'Role closed',
    body: 'The position has been filled.',
    status: 'rejected',
  },
  {
    name: 'rejection beats a thank-you line',
    subject: 'Thank you for applying',
    body: 'Thank you for applying. Unfortunately the position has been filled.',
    status: 'rejected',
  },
  {
    name: 'phone screen',
    subject: 'Phone screen',
    body: 'Can we schedule a phone screen?',
    status: 'interview',
  },
  {
    name: 'calendly next round',
    subject: 'Next round',
    body: 'Book a Calendly link for the next round.',
    status: 'interview',
  },
  {
    name: 'speak with you',
    subject: 'Hello',
    body: 'We would like to speak with you about the role.',
    status: 'interview',
  },
  {
    name: 'schedule beats an application confirmation',
    subject: 'Application received',
    body: 'We will schedule a review of your application.',
    status: 'interview',
  },
  {
    name: 'hackerrank assessment',
    subject: 'Assessment',
    body: 'Please complete the HackerRank assessment.',
    status: 'oa',
  },
  {
    name: 'codesignal challenge',
    subject: 'Coding challenge',
    body: 'Here is a CodeSignal coding challenge.',
    status: 'oa',
  },
  {
    name: 'take-home',
    subject: 'Exercise',
    body: 'This is a take-home exercise.',
    status: 'oa',
  },
  {
    name: 'take home without a hyphen',
    subject: 'Exercise',
    body: 'Please complete this take home assignment.',
    status: 'oa',
  },
  {
    name: 'codility',
    subject: 'Next step',
    body: 'Complete the Codility test.',
    status: 'oa',
  },
  {
    name: 'thank you for applying',
    subject: 'Thank you for applying to Acme',
    body: 'We will be in touch if there is a fit.',
    status: 'applied',
  },
  {
    name: 'application received',
    subject: 'Application received',
    body: 'Your application is in our system.',
    status: 'applied',
  },
  {
    name: 'received your application',
    subject: 'Acme recruiting',
    body: 'We received your application for the role.',
    status: 'applied',
  },
  {
    name: 'unrelated mail',
    subject: 'Weekly jobs digest',
    body: 'Here are some roles you might like.',
    status: null,
  },
];

describe('classifyEmail', () => {
  it.each(samples)('$name → $status', ({ subject, body, status }) => {
    const result = classifyEmail({ subject, body });
    expect(result.status).toBe(status);
    expect(result.confidence).toBe(status === null ? UNMATCHED_CONFIDENCE : RULE_CONFIDENCE);
  });

  it('reads the subject when the body is empty', () => {
    expect(classifyEmail({ subject: 'Application received' })).toEqual({
      status: 'applied',
      confidence: RULE_CONFIDENCE,
    });
  });
});
