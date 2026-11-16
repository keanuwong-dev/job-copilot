import { describe, expect, it } from 'vitest';
import { applicationRowTone, canAutoAdvance } from './status';

describe('canAutoAdvance', () => {
  it('moves forward, including skips', () => {
    expect(canAutoAdvance('saved', 'applied')).toBe(true);
    expect(canAutoAdvance('applied', 'oa')).toBe(true);
    expect(canAutoAdvance('applied', 'interview')).toBe(true);
    expect(canAutoAdvance('interview', 'offer')).toBe(true);
    expect(canAutoAdvance('saved', 'offer')).toBe(true);
  });

  it('does not downgrade or repeat a status', () => {
    expect(canAutoAdvance('interview', 'oa')).toBe(false);
    expect(canAutoAdvance('offer', 'applied')).toBe(false);
    expect(canAutoAdvance('applied', 'applied')).toBe(false);
    expect(canAutoAdvance('applied', 'saved')).toBe(false);
  });

  it('lets rejection replace an open status only', () => {
    expect(canAutoAdvance('applied', 'rejected')).toBe(true);
    expect(canAutoAdvance('offer', 'rejected')).toBe(true);
    expect(canAutoAdvance('withdrawn', 'rejected')).toBe(false);
    expect(canAutoAdvance('ghosted', 'rejected')).toBe(false);
    expect(canAutoAdvance('rejected', 'interview')).toBe(false);
  });

  it('does not treat ghosted or withdrawn as an email transition', () => {
    expect(canAutoAdvance('applied', 'ghosted')).toBe(false);
    expect(canAutoAdvance('oa', 'withdrawn')).toBe(false);
  });
});

describe('applicationRowTone', () => {
  it('keeps saved and applied rows open', () => {
    expect(applicationRowTone('saved', null)).toBe('open');
    expect(applicationRowTone('applied', 'submitted online')).toBe('open');
  });

  it('marks a live next step from status or notes', () => {
    expect(applicationRowTone('oa', null)).toBe('live');
    expect(applicationRowTone('interview', null)).toBe('plain');
    expect(applicationRowTone('offer', '')).toBe('live');
    expect(applicationRowTone('applied', 'Coffee chat Thursday')).toBe('live');
    expect(applicationRowTone('saved', 'phone screen next week')).toBe('live');
    expect(applicationRowTone('applied', 'Final round on Friday')).toBe('live');
    expect(applicationRowTone('applied', 'take-home due Monday')).toBe('live');
  });

  it('greys out applications that are over, even if notes mention an interview', () => {
    expect(applicationRowTone('rejected', 'interview went well')).toBe('closed');
    expect(applicationRowTone('ghosted', null)).toBe('closed');
    expect(applicationRowTone('withdrawn', 'coffee chat was nice')).toBe('closed');
  });
});
