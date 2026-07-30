# HighSocietyScape

A team-based OSRS fan game. Teams of ~10 players (organized in Discord) train a
*shared* virtual character by earning **real** in-game experience. The app reads
live [Wise Old Man](https://wiseoldman.net) competition data, pools each team's
event-window XP and boss kills, and turns them into a virtual character that
fights app-side bosses in a Pokémon-style, turn-based battle screen.

See [`CLAUDE.md`](./CLAUDE.md) for the full concept, architecture decisions, and
open questions.

## Requirements

- **Node ≥ 20.6** (scripts use `node --env-file`). Tested on Node 22/24.
- No npm dependencies — the scripts use only Node built-ins (native `fetch`).
- A Supabase project (Postgres). Free tier is fine.

## Setup

1. Copy the env template and fill in your Supabase values:
   ```bash
   cp .env.example .env
   ```
   | `.env` var | Where to get it | Notes |
   |---|---|---|
   | `SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Base origin ONLY, e.g. `https://<ref>.supabase.co` — **no** `/rest/v1/` suffix |
   | `SUPABASE_ANON_KEY` | API Keys → publishable key (`sb_publishable_…`) | Safe for frontend |
   | `SUPABASE_SERVICE_ROLE_KEY` | API Keys → secret key (`sb_secret_…`) | 🔒 SECRET — never commit |
   | `WOM_COMPETITION_ID` | already set to `145906` | one competition = one season |

   ⚠️ Real keys go in `.env` only (gitignored) — never in `.env.example`.

2. The schema (`supabase/migrations/0001_init.sql`) is already applied to the
   live project. Only run it if you point at a brand-new Supabase project.

## Run the pipeline

```bash
# 1) Pull fresh WOM data and cache it to data/145906-latest.json
node scripts/fetchTeamData.mjs

# 2) Push the cached snapshot into Supabase (idempotent upsert)
node --env-file=.env scripts/syncToSupabase.mjs

# 3) Read a team back as a derived character (from the DB)
node --env-file=.env scripts/showCharacter.mjs --team "Team 1"
#    …or without a DB, straight from the cached snapshot:
node scripts/showCharacter.mjs --team "Team 1" --source snapshot
```

The competition runs until **2026-08-31**, so gains keep growing — re-run the
three steps anytime to refresh. As of 2026-07-30, Team 1 derives to combat
level **111**, total level **1731**, 3 skills maxed (Strength / Hitpoints /
Ranged). Only Team 1 has substantial data so far; it's the prototype team.

## Repo map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Concept, architecture decisions, open questions (read first) |
| `xp_table.json` | OSRS xp↔level table. Single source of truth. 24 skills incl. sailing |
| `lib/wom.mjs` | Read-only WOM API client (needs a descriptive User-Agent) |
| `lib/levels.mjs` | Pure xp→level + `deriveSkillLevel` (cap-99 + overflow policy) |
| `lib/supabase.mjs` | PostgREST client, service_role (writes) |
| `lib/character.mjs` | Build character view model; anon-key DB reads (frontend path) |
| `scripts/fetchTeamData.mjs` | Competition → per-team pooled xp + boss KC → `data/` cache |
| `scripts/syncToSupabase.mjs` | Cached snapshot → Supabase (upsert) |
| `scripts/showCharacter.mjs` | Preview a team's derived character (DB or snapshot) |
| `supabase/migrations/0001_init.sql` | Schema: seasons, teams, team_members, team_skills, team_bosses |
| `data/145906-latest.json` | Cached snapshot of all 4 teams (committed) |

## Conventions

- Store **raw pooled xp per skill per team**; derive level on read from
  `xp_table.json`. Never store the derived level.
- XP source is **event-window gains** (character starts at 0 and levels up
  live), not all-time totals.
- Pooling: **sum member gains → cap level at 99 → discard overflow** (no combat
  bonus). The policy lives in `lib/levels.mjs` — change it only there.
- No 3D models / no ripped Jagex art (copyright). 2D original/icon art only.
- Repo has active collaborators — `git fetch` and rebase before pushing.
