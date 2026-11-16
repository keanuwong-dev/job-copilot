'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseApplicationWrite, TIERS, type AppStatus, type Tier } from '@job-tracker/shared';
import {
  createApplication,
  deleteApplication,
  updateApplication,
  updateApplicationStatus,
  updateApplicationTier,
} from '@/lib/applications';
import { requireUser } from '@/lib/session';

export type ActionResult = { ok: true; created?: boolean } | { ok: false; error: string };

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function createApplicationAction(input: unknown): Promise<ActionResult> {
  const parsed = parseApplicationWrite(input);
  if (!parsed.ok) return parsed;

  const { supabase, user } = await requireUser();
  try {
    const result = await createApplication(supabase, user.id, parsed.value);
    revalidatePath('/');
    return { ok: true, created: result.created };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save' };
  }
}

export async function updateApplicationAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = parseApplicationWrite(input);
  if (!parsed.ok) return parsed;

  const { supabase, user } = await requireUser();
  try {
    await updateApplication(supabase, user.id, id, parsed.value);
    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save' };
  }
}

export async function updateStatusAction(id: string, status: AppStatus): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  try {
    await updateApplicationStatus(supabase, user.id, id, status);
    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update status' };
  }
}

export async function updateTierAction(id: string, tier: Tier | null): Promise<ActionResult> {
  if (tier !== null && !TIERS.includes(tier)) return { ok: false, error: 'Invalid label' };

  const { supabase, user } = await requireUser();
  try {
    await updateApplicationTier(supabase, user.id, id, tier);
    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update label' };
  }
}

export async function deleteApplicationAction(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  try {
    await deleteApplication(supabase, user.id, id);
    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not delete' };
  }
}
