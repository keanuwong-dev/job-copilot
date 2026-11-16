import { describe, expect, it } from 'vitest';
import { normalizeLabel } from './normalize';
import { PROFILE_FIELDS, SYNONYMS, matchSynonym } from './synonyms';

describe('matchSynonym', () => {
  it('maps the spec examples', () => {
    expect(matchSynonym('LinkedIn Profile')).toBe('links.linkedin');
    expect(matchSynonym('LinkedIn URL')).toBe('links.linkedin');
    expect(matchSynonym('legally authorized')).toBe('work_auth.authorized_us');
    expect(matchSynonym('authorized to work')).toBe('work_auth.authorized_us');
    expect(matchSynonym('Sponsorship')).toBe('work_auth.needs_sponsorship');
    expect(matchSynonym('Visa')).toBe('work_auth.needs_sponsorship');
  });

  it('keeps now and future sponsorship distinct from the generic question', () => {
    expect(matchSynonym('Require sponsorship now')).toBe('work_auth.needs_sponsorship_now');
    expect(matchSynonym('Require sponsorship in the future')).toBe(
      'work_auth.needs_sponsorship_future',
    );
  });

  it('matches a normalized label exactly and ignores uncertain labels', () => {
    expect(matchSynonym('Email Address *')).toBe('personal.email');
    expect(matchSynonym('my linkedin profile')).toBeNull();
    expect(matchSynonym('Title')).toBeNull();
    expect(matchSynonym('Start date')).toBeNull();
    expect(matchSynonym('Location')).toBeNull();
    expect(matchSynonym('   ')).toBeNull();
  });

  it('has no duplicate phrases and only known fields', () => {
    const seen = new Set<string>();
    for (const entry of SYNONYMS) {
      expect(PROFILE_FIELDS).toContain(entry.field);
      for (const phrase of entry.phrases) {
        const normalized = normalizeLabel(phrase);
        expect(seen.has(normalized)).toBe(false);
        seen.add(normalized);
      }
    }
  });
});
