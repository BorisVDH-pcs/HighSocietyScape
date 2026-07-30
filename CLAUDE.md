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
    - **`team_gear`** (migration `0002`) stores each team's app-side inventory
      (owned weapons + equipped weapon, keyed by `season_id` + `team_name`).
      Unlike the WOM tables it is **written by the frontend with the anon key**
      (no auth yet → anon INSERT/UPDATE are open; documented tradeoff). The
      browser reads/writes it via `web/src/game/{supabase,gear}.js`, degrading
      to session-only gear when unconfigured or the table is absent.
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
- **Boss ladder:** a 5-rung ladder is built — **Goblin → Giant Rat → Skeleton →
  Hobgoblin → Lesser Demon** with scaling stats + per-boss weapon drops
  (`BOSS_LADDER` in `web/src/game/combat.js`). Balance/rates are first-guess.
  **Unlock gating** (CONFIRMED by Boris): bosses unlock in order — beat one to
  fight the next; you stay on a boss to farm drops and travel via the MAP.
  Per-team unlock progress persists in `team_progress` (migration 0004).
- **Pipeline:** run end-to-end against the live Supabase DB — tables populated
  (4 teams / 71 members / 96 skill rows / 142 boss rows), read-back verified.

## Open questions (ask Boris / don't assume)
- **Frontend framework** — recommending Vite + React (see below); confirm before
  committing to it.
- **First skill** to surface in the battle screen (Team 1's maxed combat skills
  are Strength / Hitpoints / Ranged).
- Drop table design at scale: the 5-boss ladder now drops weapons up to tier 3
  (per-boss `drops` in `web/src/game/combat.js`, weapons in `weapons.js`), but
  coverage is uneven (ranged stops at t2), there's **no armour/defence** yet
  (combat only uses weapon `power`), and rates/tiers are first-guess. Full gear
  and drop-table balancing is still to be designed.

## Working style notes
- Boris prefers concrete next steps over long theoretical discussion.
- Confirm assumptions briefly, then proceed — don't over-ask before building
  a rough first version.
