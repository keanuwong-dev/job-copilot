import { Suspense } from 'react';
import { AppHeader } from '@/components/app-header';
import { Tracker } from '@/components/tracker';
import { listApplications, listEmailEvents } from '@/lib/applications';
import { requireUser } from '@/lib/session';

export default function HomePage() {
  return (
    <Suspense
      fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading applications…</p>}
    >
      <TrackerPage />
    </Suspense>
  );
}

async function TrackerPage() {
  const { supabase, user } = await requireUser();
  const [applications, events] = await Promise.all([
    listApplications(supabase, user.id),
    listEmailEvents(supabase, user.id),
  ]);

  return (
    <>
      <AppHeader email={user.email ?? ''} />
      <Tracker applications={applications} events={events} asOf={new Date().toISOString()} />
    </>
  );
}
