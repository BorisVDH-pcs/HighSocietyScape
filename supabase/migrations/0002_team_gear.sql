-- HighSocietyScape — per-team gear persistence (app-side inventory).
--
-- Stores each team's owned weapons + currently-equipped weapon so gear
-- survives page reloads and is shared across a team's players. Keyed by
-- (season_id, team_name) so the frontend can read/write it with only the
-- season id + team name it already has — no uuid lookup needed.
--
-- SECURITY NOTE: unlike the read-only WOM tables (team_skills/team_bosses,
-- written only by the service-role sync script), gear is written by the
-- FRONTEND with the public ANON key — there is no auth yet. So anon INSERT
-- and UPDATE are allowed here. This is intentionally permissive: any client
-- could overwrite a team's gear. Acceptable for the prototype fan game;
-- revisit with auth (or a server-authoritative KC->drop path) if griefing
-- becomes a concern.
--
-- Run this in the Supabase SQL Editor (or via `supabase db push`).

create table if not exists team_gear (
  season_id          bigint      not null,
  team_name          text        not null,
  owned_ids          text[]      not null default '{}',
  equipped_weapon_id text,
  updated_at         timestamptz not null default now(),
  primary key (season_id, team_name)
);

alter table team_gear enable row level security;

-- Frontend (anon) may read and write gear. Upsert via PostgREST needs both
-- INSERT and UPDATE policies for the anon role.
drop policy if exists team_gear_read   on team_gear;
drop policy if exists team_gear_insert on team_gear;
drop policy if exists team_gear_update on team_gear;

create policy team_gear_read
  on team_gear for select to anon, authenticated using (true);
create policy team_gear_insert
  on team_gear for insert to anon, authenticated with check (true);
create policy team_gear_update
  on team_gear for update to anon, authenticated using (true) with check (true);
