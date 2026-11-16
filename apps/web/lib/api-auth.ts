import 'server-only';

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function authenticateApiKey(
  request: Request,
): Promise<{ userId: string } | NextResponse> {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const key = match?.[1];
  if (!key) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminSupabase>;
  try {
    admin = createAdminSupabase();
  } catch {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  const { data, error } = await admin
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', hashApiKey(key))
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  await admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);

  return { userId: data.user_id };
}

export function isAuthResponse(value: { userId: string } | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
