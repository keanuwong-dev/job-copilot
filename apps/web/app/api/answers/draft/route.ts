import { NextResponse } from 'next/server';
import { DraftRequestSchema, ProfileSchema } from '@job-tracker/shared';
import { authenticateApiKey, isAuthResponse } from '@/lib/api-auth';
import { aiConfig, draftAnswer } from '@/lib/ai';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  if (!aiConfig()) {
    return NextResponse.json({ error: 'AI is turned off' }, { status: 503 });
  }

  const auth = await authenticateApiKey(request);
  if (isAuthResponse(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON' }, { status: 400 });
  }

  const parsed = DraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid draft request' },
      { status: 400 },
    );
  }

  try {
    const profile = parsed.data.profile ?? (await storedProfile(auth.userId));
    if (!profile) {
      return NextResponse.json({ error: 'Save a profile before drafting' }, { status: 400 });
    }
    const answer = await draftAnswer({
      question: parsed.data.question,
      company: parsed.data.company,
      role: parsed.data.role,
      description: parsed.data.description,
      profile,
    });
    return NextResponse.json({ answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not draft an answer';
    const status = message === 'AI is turned off' ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

async function storedProfile(userId: string) {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('profile')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const parsed = ProfileSchema.safeParse(data.data);
  if (!parsed.success) throw new Error('Stored profile is invalid');
  return parsed.data;
}
