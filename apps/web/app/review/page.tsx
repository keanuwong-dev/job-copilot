import { Suspense } from 'react';
import { AppHeader } from '@/components/app-header';
import { ReviewQueue, type ReviewApplication, type ReviewEvent } from '@/components/review-queue';
import { requireUser } from '@/lib/session';

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading review…</p>}>
      <ReviewContent />
    </Suspense>
  );
}

async function ReviewContent() {
  const { supabase, user } = await requireUser();
  const [events, applications] = await Promise.all([
    supabase
      .from('email_events')
      .select('id, application_id, subject, snippet, detected_status, received_at, from_address')
      .eq('user_id', user.id)
      .eq('reviewed', false)
      .order('received_at', { ascending: false }),
    supabase
      .from('applications')
      .select('id, company, role, status')
      .eq('user_id', user.id)
      .order('last_activity_at', { ascending: false }),
  ]);
  if (events.error) throw new Error(events.error.message);
  if (applications.error) throw new Error(applications.error.message);

  return (
    <>
      <AppHeader email={user.email ?? ''} />
      <ReviewQueue
        events={(events.data ?? []) as ReviewEvent[]}
        applications={(applications.data ?? []) as ReviewApplication[]}
      />
    </>
  );
}
