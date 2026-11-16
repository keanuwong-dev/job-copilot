import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Profile } from '@job-tracker/shared';
import { describe, expect, it } from 'vitest';
import { ashbyAdapter } from '../src/adapters/ashby';
import { genericAdapter } from '../src/adapters/generic';
import { greenhouseAdapter } from '../src/adapters/greenhouse';
import { leverAdapter } from '../src/adapters/lever';
import { workdayAdapter } from '../src/adapters/workday';
import type { FillInput } from '../src/types';

const profile: Profile = {
  personal: {
    first_name: 'Ada',
    last_name: 'Lovelace',
    preferred_name: '',
    email: 'ada@example.com',
    phone: '555-0100',
    address_line1: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  },
  links: {
    linkedin: 'https://linkedin.com/in/ada',
    github: '',
    portfolio: '',
    website: '',
  },
  work_auth: {
    authorized_us: true,
    needs_sponsorship_now: false,
    needs_sponsorship_future: false,
  },
  education: [],
  experience: [],
  preferences: {
    desired_salary: '',
    earliest_start_date: '',
    willing_to_relocate: false,
    remote_preference: '',
  },
  eeo: {
    gender: 'decline',
    race_ethnicity: 'decline',
    hispanic_latino: 'decline',
    veteran_status: 'decline',
    disability_status: 'decline',
  },
  common_answers: { how_did_you_hear: '', cover_letter_default: '' },
  resume_path: './resume.pdf',
};

const input: FillInput = {
  profile,
  answers: [],
  resume: {
    name: 'resume.pdf',
    type: 'application/pdf',
    base64: btoa('resume-bytes'),
  },
  coverLetter: false,
};

describe('greenhouse adapter', () => {
  it('fills contact info, work auth, and resume without submitting', async () => {
    const doc = documentFor('greenhouse.html');
    doc.querySelectorAll('[role="option"]').forEach((option) => {
      option.addEventListener('click', () => option.setAttribute('data-picked', 'true'));
    });
    const url = new URL('https://boards.greenhouse.io/acme/jobs/1');
    expect(greenhouseAdapter.matches(url, doc)).toBe(true);
    expect(greenhouseAdapter.extractJob(doc, url)).toMatchObject({
      company: 'Acme',
      role: 'Software Engineer',
      location: 'Remote',
    });

    const submit = doc.querySelector('button');
    let submits = 0;
    submit?.addEventListener('click', () => {
      submits += 1;
    });

    const fields = greenhouseAdapter.findFields(doc);
    const report = await greenhouseAdapter.fill(fields, input);

    expect(value(doc, '#first_name')).toBe('Ada');
    expect(value(doc, '#last_name')).toBe('Lovelace');
    expect(value(doc, '#email')).toBe('ada@example.com');
    expect(value(doc, '#phone')).toBe('555-0100');
    expect(value(doc, '#linkedin')).toBe('https://linkedin.com/in/ada');
    expect(value(doc, '#work_auth')).toBe('yes');
    expect(doc.querySelector('[role="option"][data-picked="true"]')?.textContent).toBe('No');
    expect((doc.querySelector('#resume') as HTMLInputElement).files?.[0]?.name).toBe('resume.pdf');
    expect(value(doc, '#mystery')).toBe('');
    expect(report.attention).toBeGreaterThan(0);
    expect(submits).toBe(0);
  });
});

describe('generic adapter', () => {
  it('fills labeled fields from the profile and answer bank without submitting', async () => {
    const doc = documentFor('generic.html');
    const url = new URL('https://careers.example.com/jobs/9/apply');
    expect(genericAdapter.matches(url, doc)).toBe(false);
    expect(genericAdapter.extractJob(doc, url)).toMatchObject({
      company: 'Example Co',
      role: 'Support Engineer',
    });

    const submit = doc.querySelector('button');
    let submits = 0;
    submit?.addEventListener('click', () => {
      submits += 1;
    });

    const report = await genericAdapter.fill(genericAdapter.findFields(doc), {
      ...input,
      answers: [
        {
          question_normalized: 'why do you want this role',
          answer: 'I like careful tools.',
        },
      ],
    });
    expect(value(doc, '#email')).toBe('ada@example.com');
    expect(value(doc, '#why')).toBe('I like careful tools.');
    expect(report.items.find((item) => item.label.includes('Why'))?.usedAnswer).toBe(
      'why do you want this role',
    );
    expect(submits).toBe(0);
  });
});

describe('lever adapter', () => {
  it('fills name, email, linkedin, and resume without submitting', async () => {
    const doc = documentFor('lever.html');
    const url = new URL('https://jobs.lever.co/northwind/123/apply');
    expect(leverAdapter.matches(url, doc)).toBe(true);
    expect(leverAdapter.matches(new URL('https://www.linkedin.com/jobs'), doc)).toBe(false);
    expect(leverAdapter.extractJob(doc, url)).toMatchObject({
      company: 'Northwind',
      role: 'Product Engineer',
      location: 'New York',
    });

    const submit = doc.querySelector('button');
    let submits = 0;
    submit?.addEventListener('click', () => {
      submits += 1;
    });

    const report = await leverAdapter.fill(leverAdapter.findFields(doc), input);
    expect(value(doc, 'input[name="name"]')).toBe('Ada Lovelace');
    expect(value(doc, 'input[name="email"]')).toBe('ada@example.com');
    expect(value(doc, 'input[name="urls[LinkedIn]"]')).toBe('https://linkedin.com/in/ada');
    expect((doc.querySelector('input[name="resume"]') as HTMLInputElement).files?.[0]?.name).toBe(
      'resume.pdf',
    );
    expect(report.filled).toBeGreaterThanOrEqual(4);
    expect(submits).toBe(0);
  });
});

describe('ashby adapter', () => {
  it('fills contact info, yes/no buttons, and a dropdown without submitting', async () => {
    const doc = documentFor('ashby.html');
    doc.querySelectorAll('button, [role="option"]').forEach((element) => {
      element.addEventListener('click', () => element.setAttribute('data-picked', 'true'));
    });
    const url = new URL('https://jobs.ashbyhq.com/northstar/product-analyst/application');
    expect(ashbyAdapter.matches(url, doc)).toBe(true);
    expect(ashbyAdapter.matches(new URL('https://www.linkedin.com/jobs'), doc)).toBe(false);
    expect(ashbyAdapter.extractJob(doc, url)).toMatchObject({
      company: 'Northstar',
      role: 'Product Analyst',
      location: 'Portland, OR',
    });

    const report = await ashbyAdapter.fill(ashbyAdapter.findFields(doc), input);
    expect(value(doc, '#name')).toBe('Ada Lovelace');
    expect(value(doc, '#email')).toBe('ada@example.com');
    expect(value(doc, '#phone')).toBe('555-0100');
    expect((doc.querySelector('#resume') as HTMLInputElement).files?.[0]?.name).toBe('resume.pdf');
    expect(doc.querySelector('fieldset button[data-picked="true"]')?.textContent).toBe('Yes');
    expect(doc.querySelector('[role="option"][data-picked="true"]')?.textContent).toBe('No');
    expect(value(doc, '#why')).toBe('');
    expect(report.attention).toBeGreaterThan(0);
    expect(doc.querySelector('button[type="submit"]')?.getAttribute('data-picked')).toBeNull();
  });
});

describe('workday adapter', () => {
  it('fills only the visible step and does not continue or submit', async () => {
    const doc = documentFor('workday.html');
    const url = new URL(
      'https://acme.wd5.myworkdayjobs.com/en-US/Acme/job/Portland/Software-Engineer_R1',
    );
    expect(workdayAdapter.matches(url, doc)).toBe(true);
    expect(workdayAdapter.matches(new URL('https://www.indeed.com/viewjob'), doc)).toBe(false);
    expect(workdayAdapter.extractJob(doc, url)).toMatchObject({
      company: 'Acme',
      role: 'Software Engineer',
      location: 'Portland',
    });

    let advances = 0;
    doc.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        advances += 1;
      });
    });

    await workdayAdapter.prepare?.(doc);
    const fields = workdayAdapter.findFields(doc);
    expect(fields.some((field) => field.label.includes('Address'))).toBe(false);
    const report = await workdayAdapter.fill(fields, input);
    expect(value(doc, '#first')).toBe('Ada');
    expect(value(doc, '#last')).toBe('Lovelace');
    expect(value(doc, '#email')).toBe('ada@example.com');
    expect(value(doc, '#phone')).toBe('555-0100');
    expect((doc.querySelector('#resume') as HTMLInputElement).files?.[0]?.name).toBe('resume.pdf');
    expect(value(doc, '#address')).toBe('');
    expect(report.filled).toBeGreaterThanOrEqual(4);
    expect(advances).toBe(0);
  });

  it('waits until the current step renders its fields', async () => {
    const doc = documentFor('workday.html');
    const page = doc.querySelector('[data-automation-id="applyFlowPage"]');
    if (!(page instanceof HTMLElement)) throw new Error('Missing Workday step');
    page.replaceChildren();
    const pending = workdayAdapter.prepare?.(doc) ?? Promise.resolve();
    setTimeout(() => {
      page.innerHTML = '<label for="first">First Name*</label><input id="first" />';
    }, 20);
    await pending;
    expect(workdayAdapter.findFields(doc).some((field) => field.label.includes('First'))).toBe(true);
  });
});

function documentFor(name: string): Document {
  const html = readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf8');
  document.open();
  document.write(html);
  document.close();
  return document;
}

function value(doc: Document, selector: string): string {
  return (doc.querySelector(selector) as HTMLInputElement | HTMLSelectElement).value;
}
