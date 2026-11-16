import type { Database } from '@job-tracker/shared';

export type ApplicationRow = Database['public']['Tables']['applications']['Row'];

export type EmailEventRow = Pick<
  Database['public']['Tables']['email_events']['Row'],
  | 'id'
  | 'application_id'
  | 'subject'
  | 'snippet'
  | 'detected_status'
  | 'received_at'
  | 'from_address'
>;

export type ApiKeyRow = Pick<
  Database['public']['Tables']['api_keys']['Row'],
  'id' | 'name' | 'created_at' | 'last_used_at'
>;
