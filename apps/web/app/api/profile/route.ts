import { NextResponse } from 'next/server';
import { ProfileSchema } from '@job-tracker/shared';
import type { Json } from '@job-tracker/shared';
import { authenticateApiKey, isAuthResponse } from '@/lib/api-auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthResponse(auth)) return auth;

  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from('profile')
      .select('data, updated_at')
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, updated_at: null });
    const parsed = ProfileSchema.safeParse(data.data);
    if (!parsed.success)
      return NextResponse.json({ error: 'Stored profile is invalid' }, { status: 500 });
    return NextResponse.json({ data: parsed.data, updated_at: data.updated_at });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthResponse(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON' }, { status: 400 });
  }

  const data = body && typeof body === 'object' && 'data' in body ? body.data : body;
  const parsed = ProfileSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid profile' },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminSupabase();
    const { error } = await admin.from('profile').upsert({
      user_id: auth.userId,
      data: parsed.data as unknown as Json,
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
