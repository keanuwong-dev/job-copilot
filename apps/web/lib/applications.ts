import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildApplicationInsert,
  type ApplicationWrite,
  type Database,
  type Tier,
} from '@job-tracker/shared';
import type { ApplicationRow, EmailEventRow } from '@/lib/rows';

type Client = SupabaseClient<Database>;

async function withTierColumn<T extends { tier: Tier | null }>(
  supabase: Client,
  fields: T,
): Promise<T | Omit<T, 'tier'>> {
  const { error } = await supabase.from('applications').select('tier').limit(0);
  if (!error) return fields;
  const { tier, ...rest } = fields;
  void tier;
  return rest;
}

export async function listApplications(
  supabase: Client,
  userId: string,
): Promise<ApplicationRow[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('last_activity_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listEmailEvents(supabase: Client, userId: string): Promise<EmailEventRow[]> {
  const { data, error } = await supabase
    .from('email_events')
    .select('id, application_id, subject, snippet, detected_status, received_at, from_address')
    .eq('user_id', userId)
    .order('received_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createApplication(
  supabase: Client,
  userId: string,
  input: ApplicationWrite,
): Promise<{ application: ApplicationRow; created: boolean }> {
  if (input.job_url) {
    const { data: existing, error: lookupError } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .eq('job_url', input.job_url)
      .order('created_at', { ascending: false })
      .limit(1);
    if (lookupError) throw new Error(lookupError.message);
    const match = existing?.[0];
    if (match) return { application: match, created: false };
  }

  const { data, error } = await supabase
    .from('applications')
    .insert(await withTierColumn(supabase, buildApplicationInsert(userId, input)))
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return { application: data, created: true };
}

export async function updateApplication(
  supabase: Client,
  userId: string,
  id: string,
  input: ApplicationWrite,
): Promise<ApplicationRow> {
  const fields = await withTierColumn(supabase, buildApplicationInsert(userId, input));
  const { user_id, ...changes } = fields;
  void user_id;
  const { data, error } = await supabase
    .from('applications')
    .update(changes)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateApplicationStatus(
  supabase: Client,
  userId: string,
  id: string,
  status: ApplicationWrite['status'],
): Promise<void> {
  if (!status) throw new Error('Status is required');
  const { error } = await supabase
    .from('applications')
    .update({ status, last_activity_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function updateApplicationTier(
  supabase: Client,
  userId: string,
  id: string,
  tier: Tier | null,
): Promise<void> {
  const ready = await withTierColumn(supabase, { tier });
  if (!('tier' in ready)) {
    throw new Error('Add the label column in Supabase, then choose the label again.');
  }
  const { error } = await supabase
    .from('applications')
    .update({ tier })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function deleteApplication(
  supabase: Client,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('applications').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function lookupApplicationByUrl(supabase: Client, userId: string, url: string) {
  const { data, error } = await supabase
    .from('applications')
    .select('id, company, role, status, applied_at, job_url')
    .eq('user_id', userId)
    .eq('job_url', url)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}
