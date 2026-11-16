import { Suspense } from 'react';
import { AppHeader } from '@/components/app-header';
import { AnswersPanel, type AnswerRow } from '@/components/answers-panel';
import { requireUser } from '@/lib/session';

export default function AnswersPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading answers…</p>}>
      <AnswersContent />
    </Suspense>
  );
}

async function AnswersContent() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('answer_bank')
    .select('id, question_raw, question_normalized, answer, platform, times_used, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader email={user.email ?? ''} />
      <AnswersPanel answers={(data ?? []) as AnswerRow[]} />
    </div>
  );
}
