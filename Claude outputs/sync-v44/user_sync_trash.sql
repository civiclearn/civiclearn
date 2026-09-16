-- Run BEFORE deploying sync v44. Nothing else in v44 depends on this table,
-- but `reset` fails closed (refuses to delete) until it exists.
create table if not exists public.user_sync_trash (
  id          bigserial primary key,
  email       text        not null,
  site        text        not null,
  key         text        not null,
  data        jsonb,
  updated_at  timestamptz,
  deleted_at  timestamptz not null default now(),
  reason      text        not null default 'reset'
);
create index if not exists idx_user_sync_trash_email on public.user_sync_trash (email, site, deleted_at);
alter table public.user_sync_trash enable row level security;   -- service role bypasses RLS; nothing else can read it
comment on table public.user_sync_trash is 'Rows removed by the sync edge function reset action. Restore with: insert into user_sync (email,site,key,data,updated_at) select email,site,key,data,updated_at from user_sync_trash where id in (...) on conflict (email,site,key) do nothing;';

-- Optional cold copy to take right before the FIRST v44 deploy (rollback net for the collapse).
-- ~470 MB. Drop it once the rollout has run clean for a few weeks.
-- create table public.user_sync_stats_backup_20260916 as
--   select * from public.user_sync where key = 'civicedge_stats';
