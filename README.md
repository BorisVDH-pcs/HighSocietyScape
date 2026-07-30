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
- The **data pipeline** (`lib/`, `scripts/`) has **no npm dependencies** — only
  Node built-ins (native `fetch`).
- The **web app** (`web/`) is a Vite + React project with its own dependencies
  — run `npm install` inside `web/` once before `npm run dev`.
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
   | `WOM_API_KEY` | request via the WOM Discord | **optional** — raises the WOM rate limit from 20→100 req/min. The fetcher works without it (it retries rate-limit errors), just slower. |

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
three steps anytime to refresh. As of the latest sync, **all 4 teams have
complete data** (71/71 players, 0 missing). Team 1 derives to combat level
**111**, total level **1731**; Team 2 ≈ 108, and Teams 3 & 4 are similar.

## Run the battle app (web)

```bash
cd web
npm install          # first time only
npm run dev          # serves http://localhost:5173
```

A Vite + React, Game Boy / Pokémon-style turn-based battle screen driven by a
team's derived character. Pick a loadout in **GEAR** (Melee / Ranged / Magic —
sets your sprite and attack style), then **FIGHT** the Goblin; beating it can
drop a **Steel Sword** (1/5) into your gear. Today the app reads the **bundled
snapshot** baked in at build time; pointing it at live Supabase is a one-function
change in `web/src/game/character.js`.

## Repo map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Concept, architecture decisions, open questions (read first) |
| `HANDOVER.md` | Live status + next steps for resuming in a new session |
| `xp_table.json` | OSRS xp↔level table. Single source of truth. 24 skills incl. sailing |
| `lib/core.mjs` | **Pure, browser-safe** xp/level/character logic — shared by scripts AND the web app |
| `lib/levels.mjs` | Node wrapper: fs-loads the xp table, delegates to `core.mjs` |
| `lib/wom.mjs` | Read-only WOM API client (User-Agent + 429 retry + optional API key) |
| `lib/supabase.mjs` | PostgREST client, service_role (writes) |
| `lib/character.mjs` | Build character view model; anon-key DB reads (frontend path) |
| `scripts/fetchTeamData.mjs` | Competition → per-team pooled xp + boss KC → `data/` cache |
| `scripts/syncToSupabase.mjs` | Cached snapshot → Supabase (upsert) |
| `scripts/showCharacter.mjs` | Preview a team's derived character (DB or snapshot) |
| `supabase/migrations/0001_init.sql` | Schema: seasons, teams, team_members, team_skills, team_bosses |
| `data/145906-latest.json` | Cached snapshot of all 4 teams (committed) |
| `web/` | Vite + React battle app (see "Run the battle app") |
| `web/src/game/combat.js` | Turn-based combat engine + boss drop tables |
| `web/src/game/weapons.js` | Weapon catalog + starter inventory (gear system seed) |
| `web/src/game/character.js` | Browser character loader (imports `lib/core.mjs` + snapshot) |
| `web/src/components/BattleScreen.jsx` | Game Boy battle UI (info boxes, HP, command menu) |

## Conventions

- Store **raw pooled xp per skill per team**; derive level on read from
  `xp_table.json`. Never store the derived level.
- XP source is **event-window gains** (character starts at 0 and levels up
  live), not all-time totals.
- Pooling: **sum member gains → cap level at 99 → discard overflow** (no combat
  bonus). The policy lives in `lib/levels.mjs` — change it only there.
- No 3D models / no ripped Jagex art (copyright). 2D original/icon art only.
- Repo has active collaborators — `git fetch` and rebase before pushing.
