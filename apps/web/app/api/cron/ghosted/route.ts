import { NextResponse } from 'next/server';
import { GHOSTED_AFTER_DAYS, isGhostedCandidate } from '@job-tracker/shared';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from('applications')
      .select('id, status, last_activity_at')
      .in('status', ['applied', 'oa']);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = new Date();
    const due = (data ?? []).filter((row) =>
      isGhostedCandidate(row.status, row.last_activity_at, now, GHOSTED_AFTER_DAYS),
    );
    for (const row of due) {
      const update = await admin
        .from('applications')
        .update({ status: 'ghosted' })
        .eq('id', row.id)
        .in('status', ['applied', 'oa']);
      if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, updated: due.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not mark ghosted applications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
