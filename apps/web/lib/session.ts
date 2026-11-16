import 'server-only';

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = await createServerSupabase();
  if (!supabase) redirect('/login?error=config');

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/login');

  return { supabase, user: data.user };
}
