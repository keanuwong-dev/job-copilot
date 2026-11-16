import { describe, expect, it } from 'vitest';
import { applicationRowTone, canAutoAdvance } from './status';

describe('canAutoAdvance', () => {
  it('moves forward, including skips', () => {
    expect(canAutoAdvance('applied', 'oa')).toBe(true);
    expect(canAutoAdvance('applied', 'interview')).toBe(true);
    expect(canAutoAdvance('interview', 'offer')).toBe(true);
    expect(canAutoAdvance('applied', 'offer')).toBe(true);
  });

  it('does not downgrade or repeat a status', () => {
    expect(canAutoAdvance('interview', 'oa')).toBe(false);
    expect(canAutoAdvance('offer', 'applied')).toBe(false);
    expect(canAutoAdvance('applied', 'applied')).toBe(false);
  });

  it('lets rejection replace an open status only', () => {
    expect(canAutoAdvance('applied', 'rejected')).toBe(true);
    expect(canAutoAdvance('offer', 'rejected')).toBe(true);
    expect(canAutoAdvance('ghosted', 'rejected')).toBe(false);
    expect(canAutoAdvance('rejected', 'interview')).toBe(false);
  });

  it('does not treat ghosted as an email transition', () => {
    expect(canAutoAdvance('applied', 'ghosted')).toBe(false);
    expect(canAutoAdvance('oa', 'ghosted')).toBe(false);
  });
});

describe('applicationRowTone', () => {
  it('uses the status as the row color', () => {
    expect(applicationRowTone('applied', 'Coffee chat Thursday')).toBe('applied');
    expect(applicationRowTone('oa', null)).toBe('oa');
    expect(applicationRowTone('interview', null)).toBe('interview');
    expect(applicationRowTone('offer', '')).toBe('offer');
    expect(applicationRowTone('ghosted', null)).toBe('ghosted');
    expect(applicationRowTone('rejected', 'interview went well')).toBe('rejected');
  });
});
