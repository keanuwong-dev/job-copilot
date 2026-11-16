import { Suspense } from 'react';
import { AppHeader } from '@/components/app-header';
import { SettingsPanel } from '@/components/settings-panel';
import type { ApiKeyRow } from '@/lib/rows';
import { requireUser } from '@/lib/session';

export default function SettingsPage() {
  return (
    <Suspense
      fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading settings…</p>}
    >
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, created_at, last_used_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const keys: ApiKeyRow[] = data ?? [];

  return (
    <>
      <AppHeader email={user.email ?? ''} />
      <SettingsPanel keys={keys} />
    </>
  );
}
