-- HighSocietyScape — per-team boss kill counts.
--
-- Tracks how many times each team has killed each boss, so the drop panel can
-- show a total kill count per boss. Stored as a single jsonb map per team
-- ({ "<boss_id>": <count>, ... }) rather than a row per boss, mirroring the
-- one-row-per-team shape of team_progress and keeping the upsert a single write.
--
-- Keyed by (season_id, team_name), like team_gear / team_battle / team_progress.
--
-- SECURITY NOTE: like the other app-side tables, this is written by the FRONTEND
-- with the public ANON key (no auth yet), so anon INSERT and UPDATE are open —
-- any client could inflate a team's kill counts. It's a cosmetic stat, so this
-- is fine for the prototype; revisit with auth / a server-authoritative combat
-- loop if it ever needs to be trustworthy.
--
-- Run this in the Supabase SQL Editor (or via `supabase db push`).

create table if not exists team_kills (
  season_id   bigint      not null,
  team_name   text        not null,
  kills       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (season_id, team_name)
);

alter table team_kills enable row level security;

-- Frontend (anon) may read and write kill counts. Upsert via PostgREST needs
-- both INSERT and UPDATE policies for the anon role.
drop policy if exists team_kills_read   on team_kills;
drop policy if exists team_kills_insert on team_kills;
drop policy if exists team_kills_update on team_kills;

create policy team_kills_read
  on team_kills for select to anon, authenticated using (true);
create policy team_kills_insert
  on team_kills for insert to anon, authenticated with check (true);
create policy team_kills_update
  on team_kills for update to anon, authenticated using (true) with check (true);
