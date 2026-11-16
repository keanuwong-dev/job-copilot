'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hashApiKey } from '@/lib/api-auth';
import { requireUser } from '@/lib/session';

const nameSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
});

export type CreateKeyResult =
  { ok: true; secret: string; name: string } | { ok: false; error: string };

export async function createApiKeyAction(name: string): Promise<CreateKeyResult> {
  const parsed = nameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid name' };
  }

  const { supabase, user } = await requireUser();
  const secret = `jt_${randomBytes(32).toString('base64url')}`;
  const { error } = await supabase.from('api_keys').insert({
    user_id: user.id,
    name: parsed.data.name,
    key_hash: hashApiKey(secret),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  return { ok: true, secret, name: parsed.data.name };
}

export async function revokeApiKeyAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('api_keys').delete().eq('id', id).eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  return { ok: true };
}
