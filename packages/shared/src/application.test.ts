import { describe, expect, it } from 'vitest';
import { applicationStats, buildApplicationInsert, parseApplicationWrite } from './application';

const now = new Date('2026-11-10T18:00:00.000Z');

describe('parseApplicationWrite', () => {
  it('requires company and role', () => {
    expect(parseApplicationWrite({ company: '  ', role: 'Engineer' })).toMatchObject({
      ok: false,
    });
    expect(parseApplicationWrite({ company: 'Acme', role: '' })).toMatchObject({ ok: false });
  });

  it('turns blank text into null and stores a date-only value at noon UTC', () => {
    const parsed = parseApplicationWrite({
      company: ' Acme ',
      role: 'Engineer',
      job_url: '  ',
      company_domain: '',
      platform: '',
      applied_at: '2026-03-01',
      notes: '  hello  ',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.company).toBe('Acme');
    expect(parsed.value.job_url).toBeNull();
    expect(parsed.value.company_domain).toBeNull();
    expect(parsed.value.platform).toBeNull();
    expect(parsed.value.applied_at).toBe('2026-03-01T12:00:00.000Z');
    expect(parsed.value.notes).toBe('hello');
    expect(parsed.value.tier).toBeNull();
  });

  it('keeps a reach, target, or volume label', () => {
    const parsed = parseApplicationWrite({
      company: 'Test',
      role: 'Analyst',
      tier: 'target',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.tier).toBe('target');
    expect(parseApplicationWrite({ company: 'Test', role: 'Analyst', tier: 'maybe' }).ok).toBe(
      false,
    );
  });

  it('rejects an impossible applied date', () => {
    expect(
      parseApplicationWrite({ company: 'Acme', role: 'Engineer', applied_at: 'nope' }),
    ).toEqual({
      ok: false,
      error: 'Applied date is invalid',
    });
  });
});

describe('buildApplicationInsert', () => {
  it('defaults a new application to applied today', () => {
    const parsed = parseApplicationWrite({ company: 'Acme', role: 'Engineer' });
    if (!parsed.ok) throw new Error(parsed.error);
    expect(buildApplicationInsert('user-1', parsed.value, now)).toMatchObject({
      user_id: 'user-1',
      status: 'applied',
      applied_at: now.toISOString(),
      job_url: null,
    });
  });

  it('leaves applied_at empty for a saved application', () => {
    const parsed = parseApplicationWrite({ company: 'Acme', role: 'Engineer', status: 'saved' });
    if (!parsed.ok) throw new Error(parsed.error);
    expect(buildApplicationInsert('user-1', parsed.value, now).applied_at).toBeNull();
  });
});

describe('applicationStats', () => {
  it('counts applied work, this week, responses, interviews, and offers', () => {
    const stats = applicationStats(
      [
        { status: 'saved', applied_at: null, created_at: '2026-11-10T12:00:00.000Z' },
        {
          status: 'applied',
          applied_at: '2026-11-09T12:00:00.000Z',
          created_at: '2026-11-09T12:00:00.000Z',
        },
        {
          status: 'applied',
          applied_at: '2026-10-01T12:00:00.000Z',
          created_at: '2026-10-01T12:00:00.000Z',
        },
        {
          status: 'interview',
          applied_at: '2026-11-08T12:00:00.000Z',
          created_at: '2026-11-08T12:00:00.000Z',
        },
        {
          status: 'offer',
          applied_at: '2026-09-01T12:00:00.000Z',
          created_at: '2026-09-01T12:00:00.000Z',
        },
        {
          status: 'rejected',
          applied_at: '2026-08-01T12:00:00.000Z',
          created_at: '2026-08-01T12:00:00.000Z',
        },
        {
          status: 'ghosted',
          applied_at: '2026-07-01T12:00:00.000Z',
          created_at: '2026-07-01T12:00:00.000Z',
        },
      ],
      now,
    );

    expect(stats.totalApplied).toBe(6);
    expect(stats.appliedThisWeek).toBe(2);
    expect(stats.responseRate).toBe(3 / 6);
    expect(stats.interviews).toBe(2);
    expect(stats.offers).toBe(1);
  });

  it('has no response rate when everything is still saved', () => {
    expect(
      applicationStats(
        [{ status: 'saved', applied_at: null, created_at: '2026-11-10T12:00:00.000Z' }],
        now,
      ).responseRate,
    ).toBeNull();
  });
});
