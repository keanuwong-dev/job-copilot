import { NextResponse } from 'next/server';
import { authenticateApiKey, isAuthResponse } from '@/lib/api-auth';
import { lookupApplicationByUrl } from '@/lib/applications';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthResponse(auth)) return auth;

  const url = new URL(request.url).searchParams.get('url')?.trim() ?? '';
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

  try {
    const admin = createAdminSupabase();
    const application = await lookupApplicationByUrl(admin, auth.userId, url);
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not look up application';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
