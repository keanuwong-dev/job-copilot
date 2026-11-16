import { NextResponse } from 'next/server';
import { AnswerSaveSchema, AnswerUseSchema, normalizeLabel } from '@job-tracker/shared';
import { authenticateApiKey, isAuthResponse } from '@/lib/api-auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthResponse(auth)) return auth;

  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from('answer_bank')
      .select('question_normalized, question_raw, answer, platform, times_used, updated_at')
      .eq('user_id', auth.userId)
      .order('updated_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ answers: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load answers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthResponse(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON' }, { status: 400 });
  }

  const used = AnswerUseSchema.safeParse(body);
  if (used.success) return recordUse(auth.userId, used.data.used);

  const saved = AnswerSaveSchema.safeParse(body);
  if (!saved.success) {
    return NextResponse.json(
      { error: saved.error.issues[0]?.message ?? 'Invalid answer' },
      { status: 400 },
    );
  }

  const questionNormalized = normalizeLabel(saved.data.question);
  if (!questionNormalized) {
    return NextResponse.json({ error: 'Question is empty after normalizing' }, { status: 400 });
  }

  try {
    const admin = createAdminSupabase();
    const existing = await admin
      .from('answer_bank')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('question_normalized', questionNormalized)
      .maybeSingle();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });

    const row = {
      question_raw: saved.data.question,
      answer: saved.data.answer,
      platform: saved.data.platform ?? null,
      updated_at: new Date().toISOString(),
    };
    const write = existing.data
      ? await admin.from('answer_bank').update(row).eq('id', existing.data.id).eq('user_id', auth.userId)
      : await admin.from('answer_bank').insert({
          ...row,
          user_id: auth.userId,
          question_normalized: questionNormalized,
        });
    if (write.error) return NextResponse.json({ error: write.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, question_normalized: questionNormalized });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save answer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function recordUse(userId: string, questions: string[]) {
  try {
    const admin = createAdminSupabase();
    const normalized = [...new Set(questions.map((question) => normalizeLabel(question)).filter(Boolean))];
    if (normalized.length === 0) return NextResponse.json({ ok: true });

    const { data, error } = await admin
      .from('answer_bank')
      .select('id, times_used, question_normalized')
      .eq('user_id', userId)
      .in('question_normalized', normalized);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    for (const row of data ?? []) {
      const update = await admin
        .from('answer_bank')
        .update({ times_used: row.times_used + 1 })
        .eq('id', row.id)
        .eq('user_id', userId);
      if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update answers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
