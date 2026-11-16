'use server';

import { revalidatePath } from 'next/cache';
import { AnswerSaveSchema, normalizeLabel } from '@job-tracker/shared';
import { requireUser } from '@/lib/session';

export async function saveAnswerAction(input: {
  id?: string;
  question: string;
  answer: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = AnswerSaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid answer' };
  }
  const questionNormalized = normalizeLabel(parsed.data.question);
  if (!questionNormalized) return { ok: false, error: 'Question is empty after normalizing' };

  const { supabase, user } = await requireUser();
  const duplicate = await supabase
    .from('answer_bank')
    .select('id')
    .eq('user_id', user.id)
    .eq('question_normalized', questionNormalized)
    .maybeSingle();
  if (duplicate.error) return { ok: false, error: duplicate.error.message };
  if (duplicate.data && duplicate.data.id !== input.id) {
    return { ok: false, error: 'An answer for that question already exists' };
  }

  const row = {
    question_raw: parsed.data.question,
    question_normalized: questionNormalized,
    answer: parsed.data.answer,
    updated_at: new Date().toISOString(),
  };
  const write = input.id
    ? await supabase
        .from('answer_bank')
        .update(row)
        .eq('id', input.id)
        .eq('user_id', user.id)
        .select('id')
        .single()
    : await supabase
        .from('answer_bank')
        .insert({ ...row, user_id: user.id })
        .select('id')
        .single();
  if (write.error || !write.data) return { ok: false, error: write.error?.message ?? 'Could not save' };
  revalidatePath('/answers');
  return { ok: true, id: write.data.id };
}

export async function importAnswersAction(input: {
  items: { question: string; answer: string }[];
}): Promise<
  | { ok: true; saved: { id: string; question: string }[]; skipped: string[]; errors: string[] }
  | { ok: false; error: string }
> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: 'Nothing to save' };
  }
  if (input.items.length > 40) return { ok: false, error: 'Save up to 40 answers at a time' };

  const { supabase, user } = await requireUser();
  const saved: { id: string; question: string }[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const item of input.items) {
    const parsed = AnswerSaveSchema.safeParse(item);
    if (!parsed.success) {
      errors.push(parsed.error.issues[0]?.message ?? 'Invalid answer');
      continue;
    }
    const questionNormalized = normalizeLabel(parsed.data.question);
    if (!questionNormalized) {
      errors.push('Question is empty after normalizing');
      continue;
    }
    if (seen.has(questionNormalized)) {
      skipped.push(parsed.data.question);
      continue;
    }
    seen.add(questionNormalized);

    const duplicate = await supabase
      .from('answer_bank')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_normalized', questionNormalized)
      .maybeSingle();
    if (duplicate.error) return { ok: false, error: duplicate.error.message };
    if (duplicate.data) {
      skipped.push(parsed.data.question);
      continue;
    }

    const write = await supabase
      .from('answer_bank')
      .insert({
        user_id: user.id,
        question_raw: parsed.data.question,
        question_normalized: questionNormalized,
        answer: parsed.data.answer,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (write.error || !write.data) {
      errors.push(write.error?.message ?? 'Could not save');
      continue;
    }
    saved.push({ id: write.data.id, question: parsed.data.question });
  }

  if (saved.length > 0) revalidatePath('/answers');
  return { ok: true, saved, skipped, errors };
}

export async function deleteAnswerAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('answer_bank').delete().eq('id', id).eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/answers');
  return { ok: true };
}
