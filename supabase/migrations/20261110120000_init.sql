-- Job tracker schema.
-- Supabase already provides auth.users, auth.uid(), and the anon,
-- authenticated, and service_role roles. This migration does not create them.

create type app_status as enum (
  'saved',
  'applied',
  'oa',
  'interview',
  'offer',
  'rejected',
  'ghosted',
  'withdrawn'
);

create table profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  company_domain text,
  role text not null,
  job_url text,
  platform text,
  location text,
  status app_status not null default 'applied',
  applied_at timestamptz,
  last_activity_at timestamptz not null default now(),
  salary_range text,
  notes text,
  created_at timestamptz not null default now()
);

create table email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references applications (id) on delete set null,
  gmail_message_id text not null,
  from_address text,
  subject text,
  snippet text,
  detected_status app_status,
  confidence real,
  received_at timestamptz,
  reviewed boolean not null default false,
  unique (user_id, gmail_message_id)
);

create table answer_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_normalized text not null,
  question_raw text,
  answer text not null,
  platform text,
  times_used int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, question_normalized)
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  key_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index applications_user_id_status_idx on applications (user_id, status);
create index applications_user_id_company_domain_idx on applications (user_id, company_domain);

-- Every table is limited to auth.uid() = user_id for the signed-in user.
-- The service role bypasses RLS and is used only by server API routes.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profile',
    'applications',
    'email_events',
    'answer_bank',
    'api_keys'
  ]
  loop
    execute format('alter table %I enable row level security', table_name);
    execute format(
      'create policy %I on %I for select to authenticated using (auth.uid() = user_id)',
      table_name || '_select_own',
      table_name
    );
    execute format(
      'create policy %I on %I for insert to authenticated with check (auth.uid() = user_id)',
      table_name || '_insert_own',
      table_name
    );
    execute format(
      'create policy %I on %I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name || '_update_own',
      table_name
    );
    execute format(
      'create policy %I on %I for delete to authenticated using (auth.uid() = user_id)',
      table_name || '_delete_own',
      table_name
    );
  end loop;
end $$;

revoke all on table
  profile,
  applications,
  email_events,
  answer_bank,
  api_keys
from public, anon;

grant select, insert, update, delete on table
  profile,
  applications,
  email_events,
  answer_bank,
  api_keys
to authenticated;

grant all on table
  profile,
  applications,
  email_events,
  answer_bank,
  api_keys
to service_role;
