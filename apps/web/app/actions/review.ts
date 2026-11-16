'use server';

import { revalidatePath } from 'next/cache';
import { AppStatusSchema, parseApplicationWrite } from '@job-tracker/shared';
import { createApplication, updateApplicationStatus } from '@/lib/applications';
import { requireUser } from '@/lib/session';

export async function confirmReviewAction(input: {
  eventId: string;
  applicationId: string;
  company: string;
  role: string;
  status: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const status = AppStatusSchema.safeParse(input.status);
  if (!status.success) return { ok: false, error: 'Choose a status' };

  const { supabase, user } = await requireUser();
  let applicationId = input.applicationId;
  if (!applicationId || applicationId === 'new') {
    const parsed = parseApplicationWrite({
      company: input.company,
      role: input.role,
      status: status.data,
    });
    if (!parsed.ok) return parsed;
    try {
      const created = await createApplication(supabase, user.id, parsed.value);
      applicationId = created.application.id;
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not create application' };
    }
  } else {
    const owned = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (owned.error) return { ok: false, error: owned.error.message };
    if (!owned.data) return { ok: false, error: 'Choose an application' };
    try {
      await updateApplicationStatus(supabase, user.id, applicationId, status.data);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not update application' };
    }
  }

  const { error } = await supabase
    .from('email_events')
    .update({
      application_id: applicationId,
      detected_status: status.data,
      reviewed: true,
    })
    .eq('id', input.eventId)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/review');
  revalidatePath('/');
  return { ok: true };
}

export async function discardReviewAction(
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!eventId) return { ok: false, error: 'Missing email' };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('email_events')
    .update({ reviewed: true, application_id: null })
    .eq('id', eventId)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/review');
  return { ok: true };
}
