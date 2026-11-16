'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { APP_STATUSES, type AppStatus } from '@job-tracker/shared';
import { confirmReviewAction, discardReviewAction } from '@/app/actions/review';
import { STATUS_LABELS } from '@/components/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ReviewEvent = {
  id: string;
  application_id: string | null;
  subject: string | null;
  snippet: string | null;
  detected_status: AppStatus | null;
  received_at: string | null;
  from_address: string | null;
};

export type ReviewApplication = {
  id: string;
  company: string;
  role: string;
  status: AppStatus;
};

export function ReviewQueue({
  events,
  applications,
}: {
  events: ReviewEvent[];
  applications: ReviewApplication[];
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Emails that did not confidently match one open application. Confirm the company and
          status, or discard a message that is not an application.
        </p>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to review.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => (
            <li key={event.id}>
              <ReviewCard event={event} applications={applications} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ReviewCard({
  event,
  applications,
}: {
  event: ReviewEvent;
  applications: ReviewApplication[];
}) {
  const [applicationId, setApplicationId] = useState(event.application_id ?? 'new');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<AppStatus>(event.detected_status ?? 'applied');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        startTransition(async () => {
          const result = await confirmReviewAction({
            eventId: event.id,
            applicationId,
            company,
            role,
            status,
          });
          setMessage(result.ok ? 'Saved.' : result.error);
        });
      }}
    >
      <div>
        <h2 className="font-medium">{event.subject || 'No subject'}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {event.from_address || 'Unknown sender'}
          {event.received_at ? ` · ${event.received_at.slice(0, 10)}` : ''}
        </p>
        {event.snippet ? <p className="mt-2 text-sm text-muted-foreground">{event.snippet}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`application-${event.id}`}>Application</Label>
        <select
          id={`application-${event.id}`}
          value={applicationId}
          onChange={(change) => setApplicationId(change.target.value)}
          className="h-8 rounded-lg border bg-background px-2 text-sm"
        >
          <option value="new">Create a new application</option>
          {applications.map((application) => (
            <option key={application.id} value={application.id}>
              {application.company} — {application.role}
            </option>
          ))}
        </select>
      </div>
      {applicationId === 'new' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`company-${event.id}`}>Company</Label>
            <Input
              id={`company-${event.id}`}
              value={company}
              onChange={(change) => setCompany(change.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`role-${event.id}`}>Role</Label>
            <Input
              id={`role-${event.id}`}
              value={role}
              onChange={(change) => setRole(change.target.value)}
              required
            />
          </div>
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor={`status-${event.id}`}>Status</Label>
        <select
          id={`status-${event.id}`}
          value={status}
          onChange={(change) => setStatus(change.target.value as AppStatus)}
          className="h-8 rounded-lg border bg-background px-2 text-sm"
        >
          {APP_STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Confirm
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          aria-label="Discard email"
          onClick={() => {
            startTransition(async () => {
              const result = await discardReviewAction(event.id);
              setMessage(result.ok ? 'Discarded.' : result.error);
            });
          }}
        >
          <Trash2 />
          Discard
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}
