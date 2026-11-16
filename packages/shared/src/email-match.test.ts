import { describe, expect, it } from 'vitest';
import { classifyEmail, RULE_CONFIDENCE } from './classify';
import {
  isGhostedCandidate,
  matchApplication,
  shouldAutoApply,
  type MatchCandidate,
} from './email-match';

const acmeEngineer: MatchCandidate = {
  id: 'eng',
  company: 'Acme',
  company_domain: 'acme.com',
  role: 'Software Engineer',
  status: 'applied',
  last_activity_at: '2026-11-01T00:00:00.000Z',
};

const acmeAnalyst: MatchCandidate = {
  id: 'analyst',
  company: 'Acme',
  company_domain: 'acme.com',
  role: 'Data Analyst',
  status: 'applied',
  last_activity_at: '2026-11-08T00:00:00.000Z',
};

describe('matchApplication', () => {
  it('matches a company careers domain', () => {
    const match = matchApplication(
      {
        from: 'Acme <jobs@acme.com>',
        subject: 'Thank you for applying',
        body: 'We received your application.',
      },
      [acmeEngineer],
    );
    expect(match?.id).toBe('eng');
  });

  it('reads the company from a Greenhouse-style thank you', () => {
    const match = matchApplication(
      {
        from: 'Greenhouse <no-reply@greenhouse.io>',
        subject: 'Thank you for applying to Acme',
        body: 'Your application was received.',
      },
      [acmeEngineer],
    );
    expect(match?.id).toBe('eng');
  });

  it('uses the role when two open applications share a company', () => {
    const match = matchApplication(
      {
        from: 'no-reply@greenhouse.io',
        subject: 'Thank you for applying to Acme',
        body: 'We received your application for Software Engineer.',
      },
      [acmeEngineer, acmeAnalyst],
    );
    expect(match?.id).toBe('eng');
  });

  it('leaves two roles at the same company unmatched when the email names neither', () => {
    const match = matchApplication(
      {
        from: 'no-reply@greenhouse.io',
        subject: 'Thank you for applying to Acme',
        body: 'We received your application.',
      },
      [acmeEngineer, acmeAnalyst],
    );
    expect(match).toBeNull();
  });

  it('does not match a rejected application', () => {
    const match = matchApplication(
      {
        from: 'jobs@acme.com',
        subject: 'Thank you for applying to Acme',
        body: 'Application received.',
      },
      [{ ...acmeEngineer, status: 'rejected' }],
    );
    expect(match).toBeNull();
  });
});

describe('shouldAutoApply', () => {
  it('updates only a confident matched email', () => {
    const classified = classifyEmail({
      subject: 'Thank you for applying to Acme',
      body: 'We received your application.',
    });
    expect(classified.confidence).toBe(RULE_CONFIDENCE);
    expect(shouldAutoApply(classified, true)).toBe(true);
    expect(shouldAutoApply(classified, false)).toBe(false);
    expect(
      shouldAutoApply(classifyEmail({ subject: 'Hello', body: 'Checking in.' }), true),
    ).toBe(false);
  });
});

describe('isGhostedCandidate', () => {
  const now = new Date('2026-11-10T00:00:00.000Z');

  it('marks applied and assessment rows after 30 quiet days', () => {
    expect(isGhostedCandidate('applied', '2026-10-01T00:00:00.000Z', now)).toBe(true);
    expect(isGhostedCandidate('oa', '2026-10-01T00:00:00.000Z', now)).toBe(true);
    expect(isGhostedCandidate('applied', '2026-11-01T00:00:00.000Z', now)).toBe(false);
    expect(isGhostedCandidate('interview', '2026-09-01T00:00:00.000Z', now)).toBe(false);
  });
});
