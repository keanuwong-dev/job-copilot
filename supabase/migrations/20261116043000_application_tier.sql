alter table public.applications
  add column tier text;

alter table public.applications
  add constraint applications_tier_check
  check (tier is null or tier in ('reach', 'target', 'volume'));
