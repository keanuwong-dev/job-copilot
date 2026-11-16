import { Suspense } from 'react';
import { ProfileSchema } from '@job-tracker/shared';
import { AppHeader } from '@/components/app-header';
import { ProfileForm } from '@/components/profile-form';
import { requireUser } from '@/lib/session';

export default function ProfilePage() {
  return (
    <Suspense
      fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading profile…</p>}
    >
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('profile')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const parsed = ProfileSchema.safeParse(data?.data);

  return (
    <>
      <AppHeader email={user.email ?? ''} />
      <ProfileForm initial={parsed.success ? parsed.data : null} />
    </>
  );
}
