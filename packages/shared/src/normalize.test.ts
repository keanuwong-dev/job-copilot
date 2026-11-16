import { describe, expect, it } from 'vitest';
import { normalizeLabel } from './normalize';

describe('normalizeLabel', () => {
  it('lowercases, strips punctuation and asterisks, and collapses whitespace', () => {
    expect(normalizeLabel('First Name *')).toBe('first name');
    expect(normalizeLabel('  LinkedIn   URL ')).toBe('linkedin url');
    expect(normalizeLabel('E-mail')).toBe('e mail');
    expect(normalizeLabel('How did you hear?')).toBe('how did you hear');
    expect(normalizeLabel('Race/Ethnicity')).toBe('race ethnicity');
    expect(normalizeLabel('First\u00a0Name')).toBe('first name');
    expect(normalizeLabel('')).toBe('');
    expect(normalizeLabel('***')).toBe('');
  });
});
