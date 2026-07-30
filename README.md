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

2. The base schema (`supabase/migrations/0001_init.sql`) is already applied to
   the live project. Only run it if you point at a brand-new Supabase project.

3. **Per-team persistence** (optional) — to let looted gear and in-progress
   battles survive reloads and be shared across a team's players, apply
   `supabase/migrations/0002_team_gear.sql` **and**
   `supabase/migrations/0003_team_battle.sql` in the Supabase SQL Editor, then
   give the web app the public anon pair (see "Run the battle app"). Without
   these the app still works; gear and battle state just live in the browser
   session.

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
cp .env.example .env # optional — see below
npm run dev          # serves http://localhost:5173
```

A Vite + React, Game Boy / Pokémon-style turn-based battle screen driven by a
team's derived character. Pick a loadout in **GEAR** (Melee / Ranged / Magic —
sets your sprite and attack style), then **FIGHT** any of a **5-boss ladder**:
Goblin → Giant Rat → Skeleton → Hobgoblin → Lesser Demon, each scaling in
difficulty. Use **MAP** to travel between bosses (free choice), and
**AUTO-FIGHT** to auto-attack until someone hits 0 HP. Beating a boss can drop a
higher-tier weapon (e.g. Goblin → Steel Sword 1/5, Hobgoblin → Mithril Sword);
you **stay on the boss** afterwards so you can farm it (FIGHT AGAIN), and move on
only when you choose via MAP. The game always wields your **highest-tier**
weapon, so drops are equipped automatically. Current boss + progress persist per
team.

**Gear and battles are per team** — each team has its own inventory *and* its
own fight. Fill in `web/.env` with the public anon pair to persist both to
Supabase (survives reloads, shared across a team's players); leave it blank to
keep them in the browser session only. Close the app mid-battle with a team's
key in place and you'll resume the same fight — enemy HP, hero HP, round and
combat log intact.

| `web/.env` var | Value |
|---|---|
| `VITE_SUPABASE_URL` | same Project URL as the root `.env` |
| `VITE_SUPABASE_ANON_KEY` | the publishable/anon key (safe for frontend) |

Persistence needs migrations `0002_team_gear.sql` + `0003_team_battle.sql`
applied (see Setup step 3).

**Character stats are live.** With the `web/.env` anon pair set, the app reads
each team's *current* pooled WOM gains from Supabase (`team_skills` /
`team_bosses`) so levels reflect real progress — it seeds instantly from the
bundled snapshot, then replaces it with the live read (`loadTeamCharacterLive`
in `web/src/game/character.js`). Without the anon pair it stays on the snapshot.
Re-run the pipeline (`fetch → sync`) to refresh what the live read returns.
**Automatic freshness is wired up**: the `Refresh WOM data` GitHub Action
(`.github/workflows/refresh-wom.yml`) runs `fetch → sync` every 30 minutes and
can also be triggered by hand from the **Actions** tab (`Run workflow`) — handy
for live demos. It needs two repository secrets set (Settings → Secrets and
variables → Actions):

| Secret | Value |
|---|---|
| `SUPABASE_URL` | same Project URL as the root `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret key (🔒 write path, bypasses RLS) |

Optional: `WOM_API_KEY` (secret) to raise WOM's rate limit, and a
`WOM_COMPETITION_ID` repository **variable** to sync a different competition.
The Action only writes to Supabase (it doesn't commit the snapshot back), and —
like all scheduled workflows — it only fires once this file is on the default
branch (`main`).

## Deploy it live

The app is a **static site** (a Vite build) that talks to your already-hosted
Supabase — there's no server to run, so any static host works and the free tiers
are plenty. Config files are committed for the two easiest options; connecting
the GitHub repo is basically one click.

⚠️ The app lives in `web/` but imports shared code from the repo **root**
(`../lib`, `../xp_table.json`, `../data`), so the build must run **from the
root** — the committed configs already do this. Don't set the host's "root
directory" to `web/`.

**Netlify** (uses `netlify.toml`):
1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import from
   Git** → pick `BorisVDH-pcs/HighSocietyScape`.
2. Leave the build settings as-is (the `netlify.toml` supplies command
   `npm --prefix web ci && npm --prefix web run build` and publish `web/dist`).
3. **Site settings → Environment variables** → add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (the same public pair from your `.env`).
4. Deploy. You get a `*.netlify.app` URL; add a custom domain later if you want.

**Vercel** (uses `vercel.json`): [vercel.com/new](https://vercel.com/new) →
import the repo → add the same two env vars under **Settings → Environment
Variables** → Deploy. The `vercel.json` sets the build/output for you.

Notes:
- Both env vars are the **public anon pair** — safe to expose in a frontend
  bundle (Supabase RLS gates access). Never put the `service_role` key here.
- Every `git push` to `main` auto-redeploys.
- Deployed **stats** come from the committed snapshot (`data/145906-latest.json`)
  — refresh them by re-running `fetch → sync`, re-committing the snapshot, and
  letting it redeploy (or do the "live character data" step). **Gear** already
  persists live via Supabase, no rebuild needed.
- GitHub Pages also works but needs extra setup (a `base` path + an Actions
  workflow, and the `/logo.png` reference must respect that base) — prefer
  Netlify/Vercel unless you specifically want Pages.

## Repo map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Concept, architecture decisions, open questions (read first) |
| `HANDOVER.md` | Live status + next steps for resuming in a new session |
| `netlify.toml` / `vercel.json` | Static-deploy config (build from root → `web/dist`) — see "Deploy it live" |
| `.github/workflows/refresh-wom.yml` | Scheduled + manual `fetch → sync` every 30 min (keeps live stats fresh) |
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
| `supabase/migrations/0002_team_gear.sql` | Schema: team_gear (per-team inventory, anon read/write) |
| `supabase/migrations/0003_team_battle.sql` | Schema: team_battle (per-team in-progress fight, anon read/write) |
| `data/145906-latest.json` | Cached snapshot of all 4 teams (committed) |
| `web/` | Vite + React battle app (see "Run the battle app") |
| `web/src/game/combat.js` | Combat engine + `BOSS_LADDER` (5 bosses) / `nextBoss` + battle rehydration |
| `web/src/game/weapons.js` | Weapon catalog + tiers + best-owned/auto-equip helpers |
| `web/src/components/Sprite.jsx` | Original chibi SVG sprites — heroes + all 5 bosses (`BossSprite`) |
| `web/src/game/character.js` | Browser character loader — snapshot seed + live Supabase read |
| `web/src/game/supabase.js` | Browser PostgREST client, anon key (reads + gear writes) |
| `web/src/game/gear.js` | Load/save per-team gear to Supabase (graceful fallback) |
| `web/src/game/battle.js` | Load/save per-team in-progress battle to Supabase (graceful fallback) |
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
