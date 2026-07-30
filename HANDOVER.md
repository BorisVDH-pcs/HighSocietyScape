# HANDOVER — resuming HighSocietyScape

Read **`CLAUDE.md`** first for the concept/architecture, then **`README.md`**
for setup and run commands. This file is the live status + what to do next.

_Last updated: 2026-07-30._

---

## Where we are

The project has gone from "pipeline never run" to **a working data pipeline +
a playable, themed battle screen** with **per-team gear that persists to
Supabase** and **redrawn OSRS-style sprites** — all committed and pushed to
`main`. The one remaining big rung is live character *stats* (see next steps).

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

### Per-team gear persistence — ✅ done and LIVE
- Gear is **per team** (`gearByTeam` in `App.jsx`) — each team plays its own
  game. It's loaded from / saved to the **`team_gear`** table (owned weapons +
  equipped weapon, keyed by `season_id` + `team_name`).
- New pieces: `web/src/game/supabase.js` (browser anon PostgREST client),
  `web/src/game/gear.js` (`loadGear`/`saveGear`, graceful fallback),
  `supabase/migrations/0002_team_gear.sql`, `web/.env.example`.
- **Migration `0002_team_gear.sql` is APPLIED** to the live DB, and the full
  anon round-trip is verified (upsert 201 → read-back 200 with correct data).
  `web/.env` is set on Boris's machine (`VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY`, gitignored). On any OTHER machine: `cp
  web/.env.example web/.env` and paste the same two values (from the root
  `.env` / Supabase → Project Settings → API).
- Still degrades cleanly: with no `web/.env` (or table absent), gear falls back
  to session-only state and the app keeps working.
- **Security note (see 0002 SQL):** gear is written by the frontend with the
  public anon key (no auth yet), so anon INSERT/UPDATE are open — anyone could
  overwrite a team's gear. Fine for the prototype; revisit with auth if needed.

### Sprites / art — ✅ redrawn in an OSRS chibi style
- All sprites are original hand-drawn SVG in `web/src/components/Sprite.jsx`
  (no ripped Jagex art). Redrawn from the old grayscale stick-figures into a
  cohesive chibi look (big head, chunky gear) with a shared gear palette:
  - **Goblin** — green skin, big pointed ears, heavy brow, amber eyes, bulbous
    nose, underbite fangs, potbellied crude tunic + belt, crude spear.
  - **Warrior** — steel full helm (bronze brow + red plume, T-slot visor),
    platebody + pauldrons, heater shield w/ cross, raised steel sword.
  - **Archer** — green ranger hood, leather body + green tunic + strap, back
    quiver, recurve bow with a nocked arrow.
  - **Mage** — blue wizard robe + sash + sleeves, pointy hat w/ gold star,
    white beard, staff with a glowing orb.
- Bronze/amber accents tie the sprites into the gold "High Society" theme.
- **Logo still TODO:** drop the real logo art in as `web/public/logo.png`
  (transparent PNG, ~360px wide). Until then the header shows a styled gold
  "High Society Scape" wordmark fallback.

## Suggested next steps (pick one)
1. **Live character data** — point `web/src/game/character.js` at Supabase so
   battle STATS reflect current gains (gear already persists; stats still read
   the bundled snapshot). The browser client (`web/src/game/supabase.js`) and
   `lib/character.mjs`'s read path are ready; the main work is making the load
   async in `App.jsx` (seed-then-replace + battle re-init). For automatic
   freshness, schedule `fetch → sync` (cron / GitHub Action / Supabase fn).
2. **Boss ladder** — add bosses after the Goblin with scaling hp/accuracy/
   maxHit and their own drop tables (the `drops` array pattern already exists
   on `GOBLIN` in `combat.js`).
3. **More gear + drop tables** — expand `weapons.js` (ranged/magic drops,
   stat-varied gear, higher tiers); consider armour/defence, not just weapons.
   Auto-equip already picks the highest `tier` per style.
4. **Deploy** — `npm run build` in `web/` produces static files; host on
   Netlify/Vercel/Cloudflare Pages/GitHub Pages (pair with step 1 for live data).

## Open questions to raise with Boris
- Drop-table design at scale: which bosses drop what, rates, armour/defence,
  gear tiers. Only the Goblin → Steel Sword (1/5) exists so far.
- Character **stats** still read the bundled snapshot — wire them to live
  Supabase now (next step 1), or keep the snapshot for the prototype? (Gear
  already persists live; this is only about levels/combat stats.)
- First boss beyond the Goblin.
- Auth: gear writes use the public anon key (anyone can overwrite). Add auth
  before this goes wide?

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
