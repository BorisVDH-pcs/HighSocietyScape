# HighSocietyScape — Project Context

## Concept
A team-based OSRS (Old School RuneScape) fan game built as a web app. Teams of
~10 players (organized in a Discord server) train a *shared* virtual character
by earning real in-game experience. The app doesn't simulate training — it
reads real Wise Old Man (WOM) data and converts it into progression.

Core loop:
1. A team's real OSRS experience gains (per skill, tracked via a WOM group)
   are pooled and mapped to a virtual level for that team's shared character,
   using the standard OSRS xp curve (see `data/xp_table.json`).
2. Gear is earned via boss kill counts (also tracked through WOM). Each boss
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
- **Data source:** Wise Old Man API/group tracking for both skill experience
  gains and boss kill count deltas. WOM group ID/name: *pending — Boris will
  provide the existing group used for the previous Snakes & Rats event.*
- **Frontend:** not yet decided (framework TBD) — battle UI should support a
  health-bar duel screen with a turn-based attack loop and a combat log.
- **xp storage rule:** store *raw cumulative xp per skill per team* in the
  DB, and derive the displayed level from `xp_table.json` on read. Do not
  store the derived level itself — it will drift out of sync with WOM data.

## Data already produced
- `data/xp_table.json` — full OSRS level 1–99 xp table generated from the
  standard Jagex formula: `xp(level) = floor(sum_{n=1}^{level-1} floor(n +
  300*2^(n/7))) / 4`. Level 99 = 13,034,431 xp. Includes list of the 23 OSRS
  skills. This is the single source of truth for xp↔level conversion — don't
  regenerate it by hand elsewhere in the codebase, import/reference this file.

## Open questions (ask Boris / don't assume)
- What happens when a team exceeds level 99 (30M+ xp) in a skill — hard cap,
  or does excess xp still grant a bonus (extra damage, bonus drop rolls,
  etc.)? Not yet decided.
- Frontend framework choice.
- First boss + first skill to prototype with (Boris to pick once WOM group
  is confirmed).
- Drop table design (rates, item effects, which bosses unlock which gear)
  is still to be designed — nothing is finalized beyond the cave-crawler /
  "trials of the seas" example used as an illustration in early discussion.

## Working style notes
- Boris prefers concrete next steps over long theoretical discussion.
- Confirm assumptions briefly, then proceed — don't over-ask before building
  a rough first version.
