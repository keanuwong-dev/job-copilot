'use server';

import { revalidatePath } from 'next/cache';
import { ProfileSchema, type Json, type Profile } from '@job-tracker/shared';
import { requireUser } from '@/lib/session';

export async function saveProfileAction(
  input: Profile,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid profile' };
  }
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('profile').upsert({
    user_id: user.id,
    data: parsed.data as unknown as Json,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/profile');
  return { ok: true };
}
