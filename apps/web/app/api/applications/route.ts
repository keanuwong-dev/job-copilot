import { NextResponse } from 'next/server';
import { parseApplicationWrite } from '@job-tracker/shared';
import { authenticateApiKey, isAuthResponse } from '@/lib/api-auth';
import { createApplication } from '@/lib/applications';
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

  const parsed = parseApplicationWrite(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const admin = createAdminSupabase();
    const result = await createApplication(admin, auth.userId, parsed.value);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save application';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
