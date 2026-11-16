import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { parseProfileYaml } from './profile';

const examplePath = join(dirname(fileURLToPath(import.meta.url)), '../../../profile.example.yaml');

describe('parseProfileYaml', () => {
  it('accepts the committed example profile', () => {
    const profile = parseProfileYaml(readFileSync(examplePath, 'utf8'));
    expect(profile.personal.country).toBe('United States');
    expect(profile.work_auth.authorized_us).toBe(true);
    expect(profile.eeo.gender).toBe('decline');
    expect(profile.preferences.remote_preference).toBe('');
    expect(profile.resume_path).toBe('./resume.pdf');
  });

  it('accepts a filled profile and coerces numeric YAML scalars', () => {
    const profile = parseProfileYaml(`
personal:
  first_name: Ada
  last_name: Lovelace
  preferred_name: Ada
  email: ada@example.com
  phone: '5550100'
  address_line1: 1 Analytical Way
  city: London
  state: ''
  zip: '02115'
  country: United States
links:
  linkedin: https://www.linkedin.com/in/ada
  github: https://github.com/ada
  portfolio: ''
  website: ''
work_auth:
  authorized_us: true
  needs_sponsorship_now: false
  needs_sponsorship_future: false
education:
  - school: Example University
    degree: BS
    major: Mathematics
    gpa: 3.9
    start: 2018-09
    end: 2022-05
experience:
  - company: Analytical Engines
    title: Engineer
    location: Remote
    start: 2022-06
    end: present
    summary: Built engines.
preferences:
  desired_salary: 180000
  earliest_start_date: immediately
  willing_to_relocate: false
  remote_preference: remote
eeo:
  gender: decline
  race_ethnicity: decline
  hispanic_latino: decline
  veteran_status: decline
  disability_status: decline
common_answers:
  how_did_you_hear: Company careers page
  cover_letter_default: ''
resume_path: ./resume.pdf
`);
    expect(profile.personal.phone).toBe('5550100');
    expect(profile.personal.zip).toBe('02115');
    expect(profile.education[0]?.gpa).toBe('3.9');
    expect(profile.experience[0]?.end).toBe('present');
    expect(profile.preferences.remote_preference).toBe('remote');
  });

  it('rejects an invalid email, a bad month, and unknown keys', () => {
    expect(() =>
      parseProfileYaml(
        readFileSync(examplePath, 'utf8').replace("email: ''", "email: 'not-an-email'"),
      ),
    ).toThrow(ZodError);

    expect(() =>
      parseProfileYaml(
        readFileSync(examplePath, 'utf8').replace("start: '' # YYYY-MM", "start: '2022-13'"),
      ),
    ).toThrow(ZodError);

    expect(() => parseProfileYaml(`${readFileSync(examplePath, 'utf8')}\nsecret: value\n`)).toThrow(
      ZodError,
    );
  });

  it('rejects an unquoted zip so a leading zero is not dropped', () => {
    const source = readFileSync(examplePath, 'utf8').replace("zip: ''", 'zip: 02115');
    expect(() => parseProfileYaml(source)).toThrow(ZodError);
  });

  it('rejects present as an education end date', () => {
    const source = readFileSync(examplePath, 'utf8').replace(
      "    end: '' # YYYY-MM\nexperience:",
      "    end: 'present'\nexperience:",
    );
    expect(() => parseProfileYaml(source)).toThrow(ZodError);
  });
});
