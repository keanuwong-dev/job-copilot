import { describe, expect, it } from 'vitest';
import { parseProfileYaml } from './profile';
import { parseModelClassification, profileForDraft } from './ai';

describe('parseModelClassification', () => {
  it('reads a confident status from a JSON reply', () => {
    expect(parseModelClassification('{"status":"interview","confidence":0.8}')).toEqual({
      status: 'interview',
      confidence: 0.8,
    });
  });

  it('ignores prose around the JSON object', () => {
    expect(
      parseModelClassification('Result:\n{"status":"rejected","confidence":0.95}\nThanks'),
    ).toEqual({ status: 'rejected', confidence: 0.95 });
  });

  it('rejects ghosted, withdrawn, and broken JSON', () => {
    expect(parseModelClassification('{"status":"ghosted","confidence":0.9}')).toBeNull();
    expect(parseModelClassification('{"status":"withdrawn","confidence":0.9}')).toBeNull();
    expect(parseModelClassification('not json')).toBeNull();
    expect(parseModelClassification('{"status":"interview","confidence":2}')).toBeNull();
  });

  it('treats an explicit null status as unmatched', () => {
    expect(parseModelClassification('{"status":null,"confidence":0.4}')).toEqual({
      status: null,
      confidence: 0.2,
    });
  });
});

describe('profileForDraft', () => {
  it('omits the resume file path', () => {
    const profile = parseProfileYaml(`
personal:
  first_name: Ada
  last_name: Lovelace
  preferred_name: ""
  email: ada@example.com
  phone: ""
  address_line1: ""
  city: ""
  state: ""
  zip: ""
  country: United States
links:
  linkedin: ""
  github: ""
  portfolio: ""
  website: ""
work_auth:
  authorized_us: true
  needs_sponsorship_now: false
  needs_sponsorship_future: false
education: []
experience: []
preferences:
  desired_salary: ""
  earliest_start_date: ""
  willing_to_relocate: false
  remote_preference: ""
eeo:
  gender: decline
  race_ethnicity: decline
  hispanic_latino: decline
  veteran_status: decline
  disability_status: decline
common_answers:
  how_did_you_hear: ""
  cover_letter_default: ""
resume_path: ./resume.pdf
`);
    const text = profileForDraft(profile);
    expect(text).toContain('Ada');
    expect(text).not.toContain('resume.pdf');
  });
});
