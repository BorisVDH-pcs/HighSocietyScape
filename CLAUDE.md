# HighSocietyScape — Project Context

## Concept
A team-based OSRS (Old School RuneScape) fan game built as a web app. Teams of
~10 players (organized in a Discord server) train a *shared* virtual character
by earning real in-game experience. The app doesn't simulate training — it
reads real Wise Old Man (WOM) data and converts it into progression.

Core loop:
1. A team's real OSRS experience *gains during the event* (per skill, read
   from a WOM **competition** of type `team`) are pooled and mapped to a
   virtual level for that team's shared character, using the standard OSRS xp
   curve (see `data/xp_table.json`). The character starts at 0 xp when the
   competition opens and levels up live as the team plays.
2. Gear is earned via boss kill counts (also read from WOM). Each boss
   has a drop table with real RNG odds (e.g. ~1/100 per kill for a notable
   item), rolled once per newly-detected kill.
3. Teams equip earned gear on their virtual character and fight app-side
   bosses in a **Pokemon-style, turn-based battle screen**: player attacks,
   boss health bar drops, boss attacks back, repeat until one side is at 0.
   Stats (accuracy, damage) derive from the team's virtual levels + equipped
   gear.
4. Bosses start easy and scale up — meant to be a progression ladder for the
   whole team, not an individual player.

## Explicit non-goals / constraints
- **No 3D models, no official Jagex/OSRS art assets.** This was discussed and
  ruled out for copyright reasons. Battle screen should use original or
  simple 2D imagery (portraits/icons), not ripped game assets.
- Keep the first version deliberately small: one team, one skill, one boss,
  to validate the xp→level and kill→drop pipeline before expanding.

## Architecture decisions so far
- **Database:** Supabase (Postgres + auth), free tier. Chosen over Google
  Sheets/Apps Script (used in Boris's earlier "Snakes & Rats" project)
  specifically because this needs real persistent inventories/accounts and
  will take too much read/write volume for a spreadsheet.
    - **WOM-derived tables** (`seasons`, `teams`, `team_members`, `team_skills`,
      `team_bosses`) are **read-only to the frontend** — written only by the
      service-role sync script. Migration `0001_init.sql`.
    - **App-authored tables**, all APPLIED and written by the frontend with the
      anon key (no auth yet → anon INSERT/UPDATE are open; documented tradeoff),
      degrading to session-only when Supabase/the table is absent:
      `team_gear` (0002, owned item ids + equipped weapon — now covers all six
      gear slots, not just weapons), `team_battle` (0003, resume mid-fight),
      `team_progress` (0004, boss-ladder unlock index). Keyed by `season_id` +
      `team_name`. Read/written via `web/src/game/{supabase,gear,battle,progress}.js`.
    - **Deployment (2026-07-31):** the web app is LIVE on **Netlify**, auto-
      redeploying on push to `main`. The `VITE_SUPABASE_*` anon pair is set in
      `netlify.toml` `[build.environment]` (free plan has no dashboard env vars);
      it's the public pair, safe in-repo since RLS protects the data.
- **Data source:** Wise Old Man API, driven by a **WOM competition of type
  `team`** — NOT a group. One competition = one season/event; each team inside
  it (`participation.teamName`) maps to one shared character. This was chosen
  over a WOM group because the competition already carries the team rosters
  (no manual member management) and gives us both skill xp and boss KC.
    - **Season config = a single competition ID.** Validated against the live
      "High Society Snakes and Rats Bingo" event: `WOM_COMPETITION_ID=145906`
      (4 teams, 71 players; Team 1 has 18).
    - **Roster:** `GET /v2/competitions/{id}` → `participations` grouped by
      `teamName`.
    - **Per-skill xp + boss KC:** for each member, `GET
      /v2/players/{username}/gained?startDate={comp.startsAt}&endDate={now}`.
      The `data.skills` and `data.bosses` fields give the *gained* deltas over
      the event window; pool them across a team's members for that character.
    - **API note:** WOM rejects requests without a descriptive `User-Agent`
      header (403). Always send one identifying the app.
    - The competition's own `metric` (e.g. `ehp`) is only its leaderboard
      ranking — we ignore it and compute our own per-skill/per-boss pools.
- **Frontend:** not yet decided (framework TBD) — battle UI should support a
  health-bar duel screen with a turn-based attack loop and a combat log.
- **xp storage rule:** store *raw pooled xp gained per skill per team* (the
  event-window gains, not all-time totals) in the DB, and derive the displayed
  level from `xp_table.json` on read. Do not store the derived level itself —
  it will drift out of sync with WOM data.
- **Pooling math (CONFIRMED by Boris, 2026-07-30):** *sum member gains, cap the
  derived level at 99, and DISCARD overflow xp.* Surplus xp past 99 grants **no**
  combat/damage bonus. `deriveSkillLevel` still returns an `overflowXp` field but
  it is display-only and must not feed any game mechanic.

## Data already produced
- `xp_table.json` (repo root) — full OSRS level 1–100 xp table generated from
  the standard Jagex formula: `xp(level) = floor(sum_{n=1}^{level-1} floor(n +
  300*2^(n/7))) / 4`. Level 99 = 13,034,431 xp (level 100 = 14,391,160 is
  included as a headroom row). This is the single source of truth for xp↔level
  conversion — don't regenerate it by hand elsewhere in the codebase,
  import/reference this file.
    - **Skills list is 24 and includes `sailing`** (resolved 2026-07-30). WOM's
      API returns 24 skills including Sailing, which uses the same xp curve; the
      `skills` array covers all 24 and pooling handles it end-to-end.

## Resolved decisions (2026-07-30)
- **Pooling math:** CONFIRMED — sum gains → cap level at 99 → discard overflow
  (no combat bonus). See "Architecture decisions".
- **First boss:** the **Goblin** (easiest rung of the boss ladder).
- **Boss ladder:** a 10-rung ladder is built — **Goblin → Giant Rat → Skeleton →
  Hobgoblin → Lesser Demon → Fire Giant → Green Dragon → Frost Troll → Abyssal
  Demon → King Black Dragon** with scaling stats + per-boss weapon drops
  (`BOSS_LADDER` in `web/src/game/combat.js`, weapons to tier 5). Balance/rates
  are first-guess. Bosses are chosen on a **draggable world map** (BossMap.jsx).
  **Unlock gating** (CONFIRMED by Boris): bosses unlock in order — beat one to
  fight the next; you stay on a boss to farm drops and travel via the MAP.
  Per-team unlock progress persists in `team_progress` (migration 0004).
- **Pipeline:** run end-to-end against the live Supabase DB — tables populated
  (4 teams / 71 members / 96 skill rows / 142 boss rows), read-back verified.

## Resolved decisions (2026-07-31)
- **Frontend framework:** Vite + React — built and deployed (was "TBD").
- **Gear system:** SIX slots per style (weapon, armour, boots, cape, amulet,
  ring), each with `power`/`defence`/`accuracy`. Best owned piece per slot is
  auto-equipped (no manual inventory); GEAR shows a per-style SET-UP panel. Gear
  **drops from bosses** (Boris's choice) at low rates, one roll per kill. Combat
  now uses all three stats. Registry in `web/src/game/weapons.js`, drops in
  `BOSS_LOOT` (`combat.js`). Stat values + rates are first-guess.
- **Combat animations:** two-phase per round (player attack → boss retaliate),
  pace slowed to `ROUND_MS` 1200ms.

## Resolved decisions (2026-07-31, later)
- **Balance-tuning pass:** DONE. Boris chose a **grindy/punishing** target. The
  old ladder was found (by simulation) to be *unwinnable* at the top — the
  player is hard-capped (HP 99, max hit ~53) but boss HP/maxHit had scaled to
  1000/45. Boss stats are now **compressed to fit under the caps** (maxHit
  6→22, HP 45→760) and `DEF_FACTOR` lowered 0.5→0.35. Simulated win rates for a
  gear-appropriate team: 100/100/100/100/89/77/68/60/49/**39%** (KBD), and 0%
  from Lesser Demon on for an under-geared team, so gearing is mandatory to
  climb. All knobs centralised in `BOSS_LADDER`/`DEF_FACTOR` (`combat.js`) +
  `GEAR_SLOTS`/`BOSS_LOOT`. Sim-tuned but **not yet verified by real play.**

## Open questions (ask Boris / don't assume)
- **Balance by feel / team scaling:** the tune assumes a ~level-99 hero; weaker
  teams (low HP/combat levels) face a harder curve. Confirm the grind feels
  right in-app, and decide whether boss stats should scale to a team's combat
  level. Drop rates (`BOSS_LOOT`) left as-is — retune if the farm drags.
- **HP-timing polish:** HP bars update instantly at round start, before the boss
  lunge animates; syncing needs the engine to expose intermediate hit states.
- **First skill** to surface in the battle screen (Team 1's maxed combat skills
  are Strength / Hitpoints / Ranged).
- **Gear naming/accessories:** armour/accessory names are auto-generated per
  style tier (placeholders); accessories are style-specific. Bespoke names, or
  universal accessories — confirm.

## Working style notes
- Boris prefers concrete next steps over long theoretical discussion.
- Confirm assumptions briefly, then proceed — don't over-ask before building
  a rough first version.
