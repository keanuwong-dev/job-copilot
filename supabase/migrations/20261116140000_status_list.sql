update public.applications
set status = 'applied'
where status::text = 'saved';

update public.applications
set status = 'rejected'
where status::text = 'withdrawn';

update public.email_events
set detected_status = 'applied'
where detected_status::text = 'saved';

update public.email_events
set detected_status = 'rejected'
where detected_status::text = 'withdrawn';

alter type public.app_status rename to app_status_old;

create type public.app_status as enum (
  'applied',
  'oa',
  'interview',
  'offer',
  'ghosted',
  'rejected'
);

alter table public.applications
  alter column status drop default;

alter table public.applications
  alter column status type public.app_status
  using status::text::public.app_status;

alter table public.applications
  alter column status set default 'applied';

alter table public.email_events
  alter column detected_status type public.app_status
  using detected_status::text::public.app_status;

drop type public.app_status_old;
