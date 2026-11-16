import { NextResponse } from 'next/server';
import { InboundBatchSchema } from '@job-tracker/shared';
import { authenticateApiKey, isAuthResponse } from '@/lib/api-auth';
import { ingestEmailBatch } from '@/lib/email-ingest';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthResponse(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON' }, { status: 400 });
  }

  const parsed = InboundBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid email batch' },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminSupabase();
    const results = await ingestEmailBatch(admin, auth.userId, parsed.data.messages);
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not ingest email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
