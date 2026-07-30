# HANDOVER — resuming HighSocietyScape

Read **`CLAUDE.md`** first for the concept/architecture, then **`README.md`**
for setup and run commands. This file is the live status + what to do next.

_Last updated: 2026-07-30._

---

## Where we are

The project has gone from "pipeline never run" to **a working data pipeline +
a playable Game Boy-style battle screen**, all committed and pushed to `main`.

### Data pipeline — ✅ done and live
- WOM competition **145906** ("High Society Snakes and Rats Bingo"), type
  `team`, 4 teams / 71 players.
- `fetch → sync → read` works end-to-end against the **live Supabase DB**
  (schema applied; tables populated).
- The WOM **rate-limit bug is fixed**: `lib/wom.mjs` retries 429s (honours
  `Retry-After`, optional `WOM_API_KEY`), and `fetchTeamData.mjs` paces
  requests. A full run now returns **all 71 players across all 4 teams, 0
  missing** (previously only Team 1 had data).
- Pooling policy is **CONFIRMED**: sum member gains → cap level at 99 →
  **discard overflow** (no combat bonus). Lives in `lib/core.mjs`.

### Web battle app (`web/`) — ✅ playable
- Vite + React, **Game Boy / Gen-1 Pokémon-style** turn-based battle screen
  (`npm run dev` in `web/` → http://localhost:5173).
- Layout: enemy info + HP top-left, enemy sprite top-right, hero bottom-left,
  player info + HP bottom-right, **FIGHT / GEAR / ITEM / RUN** command box.
- **GEAR** = loadout: Melee / Ranged / Magic. Choosing one sets both the hero
  **sprite** (Warrior / Archer / Mage) and the **attack style**. FIGHT then
  strikes with the equipped gear.
- **Drop table**: beating the Goblin has a **1/5 chance to drop a Steel Sword**
  (melee, +5 power), which is added to the player's owned gear. Verified:
  ~19.7% over 40k fights.
- **Auto-equip by tier (2026-07-30)**: every weapon has a numeric `tier`. The
  game always wields the **highest-tier weapon you own** — a Steel Sword (tier
  2) drop is auto-equipped immediately, replacing the Bronze Sword (tier 1), no
  manual swap. GEAR is now a **style loadout picker** (Melee / Ranged / Magic):
  choosing a style equips the strongest weapon you own of that style — you're
  never offered a weaker tier. Logic lives in `bestOwnedWeapon` /
  `bestOwnedByStyle` (`web/src/game/weapons.js`); the auto-equip-on-drop is in
  `App.handleAttack`.
- Combat stats derive from the team's virtual levels; weapon `power` adds to
  max hit. Combat engine is UI-agnostic in `web/src/game/combat.js`.

### Branding / theme — ✅ High Society
- Header no longer shows the WOM competition title ("…Snakes and Rats Bingo").
  It loads **`web/public/logo.png`** (the gold "High Society Scape" logo); until
  that file exists it falls back to a styled gold wordmark. **Drop the logo art
  in as `web/public/logo.png`** (transparent PNG, ~360px wide).
- Palette re-themed to **molten gold on black** to match the logo
  (`web/src/styles.css`): gilded Game Boy shell, gold HP bars, gold stat cards.
  The battle screen keeps its warm-parchment Gen-1 look.
- The app currently reads the **bundled snapshot** (`data/145906-latest.json`)
  baked in at build time — NOT live Supabase yet (see next steps).

### Shared logic
- `lib/core.mjs` holds the **pure, browser-safe** xp/level/combat/character
  logic. Both the Node scripts and the web app import it (single source of
  truth). `lib/levels.mjs` / `lib/character.mjs` are thin Node wrappers.

## Suggested next steps (pick one)
1. **Live data in the app** — point `web/src/game/character.js` at Supabase
   (anon key, via `VITE_` env vars) instead of the bundled snapshot, so the
   battle reflects current gains. `lib/character.mjs` already has the read path.
   For automatic freshness, schedule `fetch → sync` (cron / GitHub Action /
   Supabase function).
2. **Boss ladder** — add bosses after the Goblin with scaling hp/accuracy/
   maxHit and their own drop tables (the `drops` array pattern already exists
   on `GOBLIN` in `combat.js`).
3. **More gear + drop tables** — expand `weapons.js` (ranged/magic drops,
   stat-varied gear); consider armour/defence, not just weapons.
4. **Deploy** — `npm run build` in `web/` produces static files; host on
   Netlify/Vercel/Cloudflare Pages/GitHub Pages (pair with step 1 for live data).
5. **Persist inventory** — owned gear currently lives in React state only
   (resets on reload). Move it to Supabase if it should stick.

## Open questions to raise with Boris
- Drop-table design at scale: which bosses drop what, rates, armour/defence,
  gear tiers. Only the Goblin → Steel Sword (1/5) exists so far.
- Should the app read live from Supabase now, or keep the bundled snapshot for
  the prototype?
- First boss beyond the Goblin.

## Working conventions
- Repo has active collaborators — `git fetch` and rebase before pushing.
- Git identity used for commits: `BorisVDH-PCS <boris@pressurecontrolsolutions.com>`.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- `.gitattributes` pins LF; the "LF will be replaced by CRLF" warnings on
  Windows are harmless (git normalises on commit).
- `.env` is gitignored — recreate it from `.env.example` on a fresh clone.
- `web/node_modules` is gitignored — run `npm install` in `web/` after cloning.
- No 3D models / no ripped Jagex or Pokémon art (copyright). Original 2D only.
