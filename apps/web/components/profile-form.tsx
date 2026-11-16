'use client';

import { useState, useTransition, type ReactNode } from 'react';
import type { Profile } from '@job-tracker/shared';
import { saveProfileAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function blankProfile(): Profile {
  return {
    personal: {
      first_name: '',
      last_name: '',
      preferred_name: '',
      email: '',
      phone: '',
      address_line1: '',
      city: '',
      state: '',
      zip: '',
      country: 'United States',
    },
    links: { linkedin: '', github: '', portfolio: '', website: '' },
    work_auth: {
      authorized_us: false,
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
}

export function ProfileForm({ initial }: { initial: Profile | null }) {
  const [profile, setProfile] = useState<Profile>(initial ?? blankProfile());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const education = profile.education[0] ?? emptyEducation();
  const experience = profile.experience[0] ?? emptyExperience();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveProfileAction(profile);
      setMessage(result.ok ? 'Saved.' : result.error);
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          The extension can pull this profile with Sync from web.
        </p>
      </div>
      <Section title="Personal">
        <Text
          label="First name"
          value={profile.personal.first_name}
          onChange={(value) => patchPersonal('first_name', value)}
        />
        <Text
          label="Last name"
          value={profile.personal.last_name}
          onChange={(value) => patchPersonal('last_name', value)}
        />
        <Text
          label="Preferred name"
          value={profile.personal.preferred_name}
          onChange={(value) => patchPersonal('preferred_name', value)}
        />
        <Text
          label="Email"
          value={profile.personal.email}
          onChange={(value) => patchPersonal('email', value)}
        />
        <Text
          label="Phone"
          value={profile.personal.phone}
          onChange={(value) => patchPersonal('phone', value)}
        />
        <Text
          label="Address"
          value={profile.personal.address_line1}
          onChange={(value) => patchPersonal('address_line1', value)}
        />
        <Text
          label="City"
          value={profile.personal.city}
          onChange={(value) => patchPersonal('city', value)}
        />
        <Text
          label="State"
          value={profile.personal.state}
          onChange={(value) => patchPersonal('state', value)}
        />
        <Text
          label="ZIP"
          value={profile.personal.zip}
          onChange={(value) => patchPersonal('zip', value)}
        />
        <Text
          label="Country"
          value={profile.personal.country}
          onChange={(value) => patchPersonal('country', value)}
        />
      </Section>
      <Section title="Links">
        <Text
          label="LinkedIn"
          value={profile.links.linkedin}
          onChange={(value) => patchLinks('linkedin', value)}
        />
        <Text
          label="GitHub"
          value={profile.links.github}
          onChange={(value) => patchLinks('github', value)}
        />
        <Text
          label="Portfolio"
          value={profile.links.portfolio}
          onChange={(value) => patchLinks('portfolio', value)}
        />
        <Text
          label="Website"
          value={profile.links.website}
          onChange={(value) => patchLinks('website', value)}
        />
      </Section>
      <Section title="Work authorization">
        <Check
          label="Authorized to work in the US"
          checked={profile.work_auth.authorized_us}
          onChange={(value) => patchAuth('authorized_us', value)}
        />
        <Check
          label="Needs sponsorship now"
          checked={profile.work_auth.needs_sponsorship_now}
          onChange={(value) => patchAuth('needs_sponsorship_now', value)}
        />
        <Check
          label="Needs sponsorship in the future"
          checked={profile.work_auth.needs_sponsorship_future}
          onChange={(value) => patchAuth('needs_sponsorship_future', value)}
        />
      </Section>
      <Section title="Education">
        <Text
          label="School"
          value={education.school}
          onChange={(value) => patchEducation('school', value)}
        />
        <Text
          label="Degree"
          value={education.degree}
          onChange={(value) => patchEducation('degree', value)}
        />
        <Text
          label="Major"
          value={education.major}
          onChange={(value) => patchEducation('major', value)}
        />
        <Text
          label="GPA"
          value={education.gpa}
          onChange={(value) => patchEducation('gpa', value)}
        />
        <Text
          label="Start"
          value={education.start}
          onChange={(value) => patchEducation('start', value)}
        />
        <Text
          label="End"
          value={education.end}
          onChange={(value) => patchEducation('end', value)}
        />
      </Section>
      <Section title="Experience">
        <Text
          label="Company"
          value={experience.company}
          onChange={(value) => patchExperience('company', value)}
        />
        <Text
          label="Title"
          value={experience.title}
          onChange={(value) => patchExperience('title', value)}
        />
        <Text
          label="Location"
          value={experience.location}
          onChange={(value) => patchExperience('location', value)}
        />
        <Text
          label="Start"
          value={experience.start}
          onChange={(value) => patchExperience('start', value)}
        />
        <Text
          label="End"
          value={experience.end}
          onChange={(value) => patchExperience('end', value)}
        />
        <label className="grid gap-1 sm:col-span-2">
          <Label>Summary</Label>
          <Textarea
            value={experience.summary}
            onChange={(event) => patchExperience('summary', event.target.value)}
            rows={3}
          />
        </label>
      </Section>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );

  function patchPersonal(key: keyof Profile['personal'], value: string) {
    setProfile({ ...profile, personal: { ...profile.personal, [key]: value } });
  }
  function patchLinks(key: keyof Profile['links'], value: string) {
    setProfile({ ...profile, links: { ...profile.links, [key]: value } });
  }
  function patchAuth(key: keyof Profile['work_auth'], value: boolean) {
    setProfile({ ...profile, work_auth: { ...profile.work_auth, [key]: value } });
  }
  function patchEducation(key: keyof Profile['education'][number], value: string) {
    const next = { ...education, [key]: value };
    setProfile({ ...profile, education: [next, ...profile.education.slice(1)] });
  }
  function patchExperience(key: keyof Profile['experience'][number], value: string) {
    const next = { ...experience, [key]: value };
    setProfile({ ...profile, experience: [next, ...profile.experience.slice(1)] });
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm sm:col-span-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function emptyEducation(): Profile['education'][number] {
  return { school: '', degree: '', major: '', gpa: '', start: '', end: '' };
}

function emptyExperience(): Profile['experience'][number] {
  return { company: '', title: '', location: '', start: '', end: '', summary: '' };
}
