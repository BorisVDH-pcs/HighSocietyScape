-- HighSocietyScape — per-team battle-state persistence (resume mid-fight).
--
-- Stores each team's in-progress battle so closing the app mid-battle and
-- returning resumes the SAME fight — enemy HP, hero HP, round and combat log
-- intact. Keyed by (season_id, team_name), exactly like team_gear, so the
-- frontend can read/write it with only the season id + team name it already
-- has.
--
-- Only the VOLATILE state is stored (round, status, boss id + hp, player hp,
-- equipped weapon id, log). Boss stats, sprites and combat styles are rebuilt
-- from code + the live character on read (see web/src/game/combat.js
-- rehydrateBattle), so a later balance or art change is never frozen into a
-- stale saved blob.
--
-- SECURITY NOTE: like team_gear, this is written by the FRONTEND with the
-- public ANON key — there is no auth yet. So anon INSERT and UPDATE are open:
-- any client could overwrite a team's saved battle. For a ~10-player SHARED
-- character that is the intent (one shared game), but two players fighting at
-- the same time will clobber each other's saved state. Acceptable for the
-- prototype; revisit with auth (or a server-authoritative combat loop) if it
-- becomes a concern.
--
-- Run this in the Supabase SQL Editor (or via `supabase db push`).

create table if not exists team_battle (
  season_id   bigint      not null,
  team_name   text        not null,
  round       integer     not null default 0,
  status      text        not null default 'active',
  boss_id     text        not null,
  boss_hp     integer     not null,
  player_hp   integer     not null,
  weapon_id   text,
  log         jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (season_id, team_name)
);

alter table team_battle enable row level security;

-- Frontend (anon) may read and write battle state. Upsert via PostgREST needs
-- both INSERT and UPDATE policies for the anon role.
drop policy if exists team_battle_read   on team_battle;
drop policy if exists team_battle_insert on team_battle;
drop policy if exists team_battle_update on team_battle;

create policy team_battle_read
  on team_battle for select to anon, authenticated using (true);
create policy team_battle_insert
  on team_battle for insert to anon, authenticated with check (true);
create policy team_battle_update
  on team_battle for update to anon, authenticated using (true) with check (true);
