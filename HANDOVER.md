# HANDOVER — resuming HighSocietyScape on another device

You are continuing an in-progress project. **Read `CLAUDE.md` first** for the
full concept and architecture; this file is the live status + exact steps to
get running on a fresh machine.

_Last updated: 2026-07-30._

---

## TL;DR of where we are

The data pipeline is **built and proven end-to-end in code**, but has **not yet
run against the database**, because the original device could not install
Node. Everything is committed and pushed to `main`.

- ✅ WOM data source confirmed: **competition 145906** ("High Society Snakes and
  Rats Bingo"), type `team`, 4 teams / 71 players.
- ✅ Fetch + pooling + level derivation written and validated against live WOM
  data (via PowerShell, since Node was unavailable).
- ✅ Supabase project created; schema migration (`supabase/migrations/0001_init.sql`)
  **already applied** — all 5 tables exist and were confirmed readable via the
  REST API with both the publishable and secret keys.
- ✅ Read layer (DB → derived character, incl. OSRS combat level) written.
- ⏳ **Not done yet:** actually running the sync to populate the DB, because
  that needs Node ≥ 20.6. The Supabase tables are currently **empty**.

## First thing to do on the new device

1. **Clone the repo** and `cd` into it.
2. **Install Node 22 LTS** (must be ≥ 20.6 — the scripts use `node --env-file`).
   Verify: `node --version`.
3. **Recreate `.env`** (it is gitignored, so it did NOT come with the clone):
   ```bash
   cp .env.example .env
   ```
   Then fill in these values from **Supabase → Project Settings → API Keys**:
   | `.env` var | Where to get it | Notes |
   |---|---|---|
   | `SUPABASE_URL` | Project Settings → API → Project URL | Base origin ONLY, e.g. `https://<ref>.supabase.co` — **no** `/rest/v1/` suffix |
   | `SUPABASE_ANON_KEY` | API Keys → publishable key (`sb_publishable_…`) | Safe for frontend |
   | `SUPABASE_SERVICE_ROLE_KEY` | API Keys → secret key (`sb_secret_…`), "Reveal" then copy | 🔒 SECRET. Never commit. Use the **copy button**, no spaces/quotes |
   - `WOM_COMPETITION_ID=145906` is already in the template.
   - The secret key was **rotated once** already; the active one is named
     `testkey` in the dashboard. Copy the current value.
   - ⚠️ NEVER put real keys in `.env.example` or any tracked file. Only `.env`.

4. **Do NOT re-run the SQL migration** — the tables already exist in the live
   project. (Only run it if you point at a brand-new Supabase project.)

## Then run the pipeline

```bash
# 1) Pull fresh WOM data and cache it to data/145906-latest.json
node scripts/fetchTeamData.mjs

# 2) Push the cached snapshot into Supabase (idempotent upsert)
node --env-file=.env scripts/syncToSupabase.mjs
#    Expect: Synced season 145906 ... 4 teams, 71 members, 96 skill rows, 71 boss rows.

# 3) Read it back as a derived character
node --env-file=.env scripts/showCharacter.mjs --team "Team 1"
#    Or without a DB:  node scripts/showCharacter.mjs --team "Team 1" --source snapshot
```

**Sanity check** (as of 2026-07-30 — these numbers GROW over time, since they are
live event gains and the competition runs until 2026-08-31):
Team 1 → combat level **111**, total level **1730**, 3 skills maxed
(Strength / Hitpoints / Ranged). If you see roughly this or higher, it works.

## Repo map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Concept, architecture decisions, open questions (read first) |
| `xp_table.json` | OSRS xp↔level table (root). Single source of truth. 24 skills incl. sailing |
| `lib/wom.mjs` | Read-only WOM API client (needs descriptive User-Agent) |
| `lib/levels.mjs` | Pure xp→level + `deriveSkillLevel` (cap-99 + overflow policy lives here) |
| `lib/supabase.mjs` | PostgREST client, service_role (writes) |
| `lib/character.mjs` | Build character view model; anon-key DB reads (frontend path) |
| `scripts/fetchTeamData.mjs` | Competition → per-team pooled xp + boss KC → `data/` cache |
| `scripts/syncToSupabase.mjs` | Cached snapshot → Supabase (upsert) |
| `scripts/showCharacter.mjs` | Preview a team's derived character (DB or snapshot) |
| `supabase/migrations/0001_init.sql` | Schema: seasons, teams, team_members, team_skills, team_bosses |
| `data/145906-latest.json` | Cached snapshot of all 4 teams (committed) |

## Key design rules (don't violate)

- Store **raw pooled xp per skill per team**; derive level on read from
  `xp_table.json`. Never store the derived level.
- XP source is **event-window gains** (character starts at 0 and levels up live),
  not all-time totals.
- Pooling policy = **sum member gains → cap level at 99 → overflow xp becomes a
  future combat bonus**. This is a *working recommendation, NOT yet confirmed by
  Boris* — see Open questions.
- No 3D models / no ripped Jagex art (copyright). 2D original/icon art only.

## Open questions to raise with Boris

1. **Confirm the pooling math** (sum + cap-99 + overflow). Everything downstream
   depends on it. Combat skills already hit 99 within ~2 weeks.
2. **Frontend framework** — not yet chosen. Battle UI needs a health-bar duel
   screen + turn-based attack loop + combat log.
3. **First boss + first skill** to prototype the battle screen with.
4. **Drop table design** (rates, item effects, gear unlocks) — not started.

## Suggested next step

Build the **battle screen**: a Pokémon-style turn-based duel that scales off the
team's combat level (111 for Team 1 today). Start with the state machine +
combat log using the derived character; art and gear come later.

## Working conventions

- Repo has active collaborators — `git fetch` and rebase before pushing.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Note: on the origin device, Node/Python were unavailable; validation was done
  with PowerShell + curl. On a normal dev machine just use Node.
- If the project folder is inside OneDrive, `.env` will sync to OneDrive's cloud
  (private, but off-machine). Keep the repo outside OneDrive if you want to
  avoid that.
