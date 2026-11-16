import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  canAutoAdvance,
  classifyEmail,
  matchApplication,
  shouldAutoApply,
  type Classification,
  type Database,
  type InboundEmail,
  type MatchCandidate,
} from '@job-tracker/shared';
import { aiConfig, classifyAmbiguousEmail } from '@/lib/ai';

type Client = SupabaseClient<Database>;

export type IngestResult = {
  gmail_message_id: string;
  duplicate: boolean;
  application_id: string | null;
  status: string | null;
};

export async function ingestEmailBatch(
  supabase: Client,
  userId: string,
  messages: readonly InboundEmail[],
): Promise<IngestResult[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('id, company, company_domain, role, status, last_activity_at')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  const applications = [...((data ?? []) as MatchCandidate[])];
  const results: IngestResult[] = [];

  for (const message of messages) {
    const existing = await supabase
      .from('email_events')
      .select('id, application_id, detected_status')
      .eq('user_id', userId)
      .eq('gmail_message_id', message.gmail_message_id)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) {
      results.push({
        gmail_message_id: message.gmail_message_id,
        duplicate: true,
        application_id: existing.data.application_id,
        status: existing.data.detected_status,
      });
      continue;
    }

    const text = [message.subject, message.snippet, message.body].filter(Boolean).join('\n');
    const classification = await classificationFor(message.subject, text);
    const matched = matchApplication(
      { from: message.from, subject: message.subject, body: text },
      applications,
    );
    const auto = shouldAutoApply(classification, matched != null);
    const receivedAt = parsedTime(message.received_at);
    if (auto && matched && classification.status) {
      const current = applications.find((application) => application.id === matched.id);
      if (current && canAutoAdvance(current.status, classification.status)) {
        const updated = await supabase
          .from('applications')
          .update({ status: classification.status, last_activity_at: receivedAt })
          .eq('id', matched.id)
          .eq('user_id', userId);
        if (updated.error) throw new Error(updated.error.message);
        current.status = classification.status;
        current.last_activity_at = receivedAt;
      } else if (current) {
        const touched = await supabase
          .from('applications')
          .update({ last_activity_at: receivedAt })
          .eq('id', matched.id)
          .eq('user_id', userId);
        if (touched.error) throw new Error(touched.error.message);
        current.last_activity_at = receivedAt;
      }
    }

    const inserted = await supabase
      .from('email_events')
      .insert({
        user_id: userId,
        application_id: matched?.id ?? null,
        gmail_message_id: message.gmail_message_id,
        from_address: message.from || null,
        subject: message.subject || null,
        snippet: message.snippet || message.body.slice(0, 240) || null,
        detected_status: classification.status,
        confidence: classification.confidence,
        received_at: receivedAt,
        reviewed: auto,
      })
      .select('id')
      .single();
    if (inserted.error) {
      if (inserted.error.code === '23505') {
        results.push({
          gmail_message_id: message.gmail_message_id,
          duplicate: true,
          application_id: matched?.id ?? null,
          status: classification.status,
        });
        continue;
      }
      throw new Error(inserted.error.message);
    }

    results.push({
      gmail_message_id: message.gmail_message_id,
      duplicate: false,
      application_id: matched?.id ?? null,
      status: classification.status,
    });
  }

  return results;
}

async function classificationFor(subject: string, body: string): Promise<Classification> {
  const rules = classifyEmail({ subject, body });
  if (rules.status || !aiConfig()) return rules;
  const model = await classifyAmbiguousEmail({ subject, body });
  return model ?? rules;
}

function parsedTime(value: string): string {
  const time = Date.parse(value);
  return Number.isNaN(time) ? new Date().toISOString() : new Date(time).toISOString();
}
