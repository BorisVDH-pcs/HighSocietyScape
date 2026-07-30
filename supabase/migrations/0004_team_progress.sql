-- HighSocietyScape — per-team boss-ladder progress (unlock gating).
--
-- Stores how far up the boss ladder each team has climbed, so bosses unlock in
-- order: you must beat rung i to fight rung i+1. `max_boss_index` is the highest
-- ladder index the team has UNLOCKED (0 = only the Goblin, the first rung). It's
-- kept SEPARATE from team_battle on purpose: a team can re-farm an earlier boss
-- (its current fight) while still having later rungs unlocked, and battle
-- persistence stays unaffected if this migration hasn't been applied yet.
--
-- Keyed by (season_id, team_name), like team_gear / team_battle.
--
-- SECURITY NOTE: like the other app-side tables, this is written by the FRONTEND
-- with the public ANON key (no auth yet), so anon INSERT and UPDATE are open —
-- any client could bump a team's progress. Acceptable for the prototype; revisit
-- with auth / a server-authoritative combat loop if it becomes a concern.
--
-- Run this in the Supabase SQL Editor (or via `supabase db push`).

create table if not exists team_progress (
  season_id       bigint      not null,
  team_name       text        not null,
  max_boss_index  integer     not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (season_id, team_name)
);

alter table team_progress enable row level security;

-- Frontend (anon) may read and write progress. Upsert via PostgREST needs both
-- INSERT and UPDATE policies for the anon role.
drop policy if exists team_progress_read   on team_progress;
drop policy if exists team_progress_insert on team_progress;
drop policy if exists team_progress_update on team_progress;

create policy team_progress_read
  on team_progress for select to anon, authenticated using (true);
create policy team_progress_insert
  on team_progress for insert to anon, authenticated with check (true);
create policy team_progress_update
  on team_progress for update to anon, authenticated using (true) with check (true);
