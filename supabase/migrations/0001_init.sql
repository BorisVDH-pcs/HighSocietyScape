-- HighSocietyScape — initial schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
--
-- Design rule (see CLAUDE.md): store RAW pooled xp per skill per team. The
-- virtual level is DERIVED on read from xp_table.json and never stored, so it
-- can't drift from WOM data.

create extension if not exists "pgcrypto";

-- A season == one WOM competition of type `team`.
create table if not exists seasons (
  id         bigint primary key,            -- WOM competition id (e.g. 145906)
  title      text        not null,
  metric     text,                          -- WOM leaderboard metric; informational only
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

-- One shared character per team within a season.
create table if not exists teams (
  id           uuid        primary key default gen_random_uuid(),
  season_id    bigint      not null references seasons(id) on delete cascade,
  name         text        not null,        -- e.g. "Team 1"
  member_count int         not null default 0,
  created_at   timestamptz not null default now(),
  unique (season_id, name)
);

-- Roster (WOM members of each team).
create table if not exists team_members (
  team_id      uuid not null references teams(id) on delete cascade,
  username     text not null,               -- WOM username (canonical lowercase key)
  display_name text,
  primary key (team_id, username)
);

-- Pooled xp per skill per team. Level derived on read — DO NOT store level here.
create table if not exists team_skills (
  team_id    uuid        not null references teams(id) on delete cascade,
  skill      text        not null,
  pooled_xp  bigint      not null default 0 check (pooled_xp >= 0),
  updated_at timestamptz not null default now(),
  primary key (team_id, skill)
);

-- Pooled boss kill counts per team (feeds the kill -> drop-roll gear loop).
create table if not exists team_bosses (
  team_id    uuid        not null references teams(id) on delete cascade,
  boss       text        not null,
  pooled_kc  integer     not null default 0 check (pooled_kc >= 0),
  updated_at timestamptz not null default now(),
  primary key (team_id, boss)
);

create index if not exists idx_teams_season      on teams(season_id);
create index if not exists idx_team_skills_team  on team_skills(team_id);
create index if not exists idx_team_bosses_team  on team_bosses(team_id);

-- Row Level Security: the app reads with the anon key; writes happen only from
-- the sync script using the service_role key (which bypasses RLS).
alter table seasons      enable row level security;
alter table teams        enable row level security;
alter table team_members enable row level security;
alter table team_skills  enable row level security;
alter table team_bosses  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['seasons','teams','team_members','team_skills','team_bosses']
  loop
    execute format(
      'create policy %I on %I for select to anon, authenticated using (true)',
      'public_read_' || t, t
    );
  end loop;
end $$;
