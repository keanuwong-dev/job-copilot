import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@job-tracker/shared';
import { publicSupabaseEnv } from '@/lib/env';

export function createBrowserSupabase() {
  const env = publicSupabaseEnv();
  if (!env) {
    throw new Error('Supabase is not configured');
  }
  return createBrowserClient<Database>(env.url, env.anonKey);
}
