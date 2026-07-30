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
- **Pooling math (still open — see Open questions):** current working
  recommendation is *sum member gains, cap the derived level at 99, and
  convert overflow xp into a combat/damage bonus*. Not yet confirmed by Boris.

## Data already produced
- `xp_table.json` (repo root) — full OSRS level 1–100 xp table generated from
  the standard Jagex formula: `xp(level) = floor(sum_{n=1}^{level-1} floor(n +
  300*2^(n/7))) / 4`. Level 99 = 13,034,431 xp (level 100 = 14,391,160 is
  included as a headroom row). This is the single source of truth for xp↔level
  conversion — don't regenerate it by hand elsewhere in the codebase,
  import/reference this file.
    - **Skills list is currently 23 and omits `sailing`.** WOM's API now
      returns 24 skills including Sailing, which uses the same xp curve — the
      `skills` array in this file needs `sailing` added so pooling covers all
      24. (The `levels` table itself is skill-agnostic and needs no change.)

## Open questions (ask Boris / don't assume)
- **Pooling math + level-99 overflow.** Summing ~18 members' event gains pushes
  combat skills past the 99 cap within ~2 weeks (validated: Team 1 Strength
  gained 19.3M vs. the 13.03M cap after ~13 days). Working recommendation is
  *sum gains → cap level at 99 → convert overflow xp into a combat/damage
  bonus*; alternatives are averaging across members or a diminishing-returns
  curve. Not yet confirmed.
- Frontend framework choice.
- First boss + first skill to prototype with (Boris to pick). Data source is
  now confirmed (WOM competition 145906, Team 1 fully readable).
- Drop table design (rates, item effects, which bosses unlock which gear)
  is still to be designed — nothing is finalized beyond the cave-crawler /
  "trials of the seas" example used as an illustration in early discussion.

## Working style notes
- Boris prefers concrete next steps over long theoretical discussion.
- Confirm assumptions briefly, then proceed — don't over-ask before building
  a rough first version.
