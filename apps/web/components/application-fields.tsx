'use client';

import type { ReactNode } from 'react';
import {
  APP_STATUSES,
  PLATFORMS,
  TIERS,
  type AppStatus,
  type Platform,
  type Tier,
} from '@job-tracker/shared';
import type { ApplicationRow } from '@/lib/rows';
import { PLATFORM_LABELS, STATUS_LABELS, STATUS_OPTION_CLASS, TIER_LABELS } from '@/components/labels';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export type ApplicationDraft = {
  company: string;
  role: string;
  status: AppStatus;
  applied_at: string;
  platform: Platform | '';
  location: string;
  job_url: string;
  company_domain: string;
  salary_range: string;
  notes: string;
  tier: Tier | '';
};

export function emptyDraft(): ApplicationDraft {
  return {
    company: '',
    role: '',
    status: 'applied',
    applied_at: '',
    platform: '',
    location: '',
    job_url: '',
    company_domain: '',
    salary_range: '',
    notes: '',
    tier: '',
  };
}

export function draftFromRow(row: ApplicationRow): ApplicationDraft {
  const platform = PLATFORMS.find((item) => item === row.platform) ?? '';
  return {
    company: row.company,
    role: row.role,
    status: row.status,
    applied_at: row.applied_at?.slice(0, 10) ?? '',
    platform,
    location: row.location ?? '',
    job_url: row.job_url ?? '',
    company_domain: row.company_domain ?? '',
    salary_range: row.salary_range ?? '',
    notes: row.notes ?? '',
    tier: row.tier ?? '',
  };
}

export function ApplicationFields({
  draft,
  onChange,
  idPrefix,
}: {
  draft: ApplicationDraft;
  onChange: (draft: ApplicationDraft) => void;
  idPrefix: string;
}) {
  function set<K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Company" id={`${idPrefix}-company`}>
        <Input
          id={`${idPrefix}-company`}
          value={draft.company}
          onChange={(event) => set('company', event.target.value)}
          required
        />
      </Field>
      <Field label="Role" id={`${idPrefix}-role`}>
        <Input
          id={`${idPrefix}-role`}
          value={draft.role}
          onChange={(event) => set('role', event.target.value)}
          required
        />
      </Field>
      <Field label="Status" id={`${idPrefix}-status`}>
        <Select
          value={draft.status}
          onValueChange={(value) => {
            if (value) set('status', value as AppStatus);
          }}
        >
          <SelectTrigger id={`${idPrefix}-status`} className="w-full">
            <SelectValue>{STATUS_LABELS[draft.status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {APP_STATUSES.map((status) => (
              <SelectItem key={status} value={status} className={STATUS_OPTION_CLASS[status]}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Label" id={`${idPrefix}-tier`}>
        <Select
          value={draft.tier}
          onValueChange={(value) => set('tier', (value ?? '') as Tier | '')}
        >
          <SelectTrigger id={`${idPrefix}-tier`} className="w-full">
            <SelectValue>{draft.tier ? TIER_LABELS[draft.tier] : 'Not set'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Not set</SelectItem>
            {TIERS.map((tier) => (
              <SelectItem key={tier} value={tier}>
                {TIER_LABELS[tier]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Applied" id={`${idPrefix}-applied`}>
        <Input
          id={`${idPrefix}-applied`}
          type="date"
          value={draft.applied_at}
          onChange={(event) => set('applied_at', event.target.value)}
        />
      </Field>
      <Field label="Platform" id={`${idPrefix}-platform`}>
        <Select
          value={draft.platform}
          onValueChange={(value) => set('platform', (value ?? '') as Platform | '')}
        >
          <SelectTrigger id={`${idPrefix}-platform`} className="w-full">
            <SelectValue>
              {draft.platform ? PLATFORM_LABELS[draft.platform] : 'Not set'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Not set</SelectItem>
            {PLATFORMS.map((platform) => (
              <SelectItem key={platform} value={platform}>
                {PLATFORM_LABELS[platform]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Location" id={`${idPrefix}-location`}>
        <Input
          id={`${idPrefix}-location`}
          value={draft.location}
          onChange={(event) => set('location', event.target.value)}
        />
      </Field>
      <Field label="Job URL" id={`${idPrefix}-url`} className="sm:col-span-2">
        <Input
          id={`${idPrefix}-url`}
          type="url"
          value={draft.job_url}
          onChange={(event) => set('job_url', event.target.value)}
          placeholder="https://"
        />
      </Field>
      <Field label="Company domain" id={`${idPrefix}-domain`}>
        <Input
          id={`${idPrefix}-domain`}
          value={draft.company_domain}
          onChange={(event) => set('company_domain', event.target.value)}
          placeholder="stripe.com"
        />
      </Field>
      <Field label="Salary range" id={`${idPrefix}-salary`}>
        <Input
          id={`${idPrefix}-salary`}
          value={draft.salary_range}
          onChange={(event) => set('salary_range', event.target.value)}
        />
      </Field>
      <Field label="Notes" id={`${idPrefix}-notes`} className="sm:col-span-2">
        <Textarea
          id={`${idPrefix}-notes`}
          value={draft.notes}
          onChange={(event) => set('notes', event.target.value)}
          rows={4}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5">
        {label}
      </Label>
      {children}
    </div>
  );
}
