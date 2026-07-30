# HANDOVER — resuming HighSocietyScape

Read **`CLAUDE.md`** first for the concept/architecture, then **`README.md`**
for setup and run commands. This file is the live status + what to do next.

_Last updated: 2026-07-30._

---

## Where we are

The project has gone from "pipeline never run" to **a working data pipeline +
a playable, themed battle screen** with **live character stats**, a **5-boss
progression ladder** (Goblin → … → Lesser Demon), **per-team gear AND battle
state that persist to Supabase** (resume a fight mid-battle), **redrawn
OSRS-style sprites**, and an **automated data-refresh Action** (`fetch → sync`
every 30 min + manual trigger) — committed and pushed. The core loop is now
closed end-to-end; remaining work is content/polish (more gear, balance,
deploy) — see next steps.

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
- **Drop tables**: each boss has its own (see "Boss ladder" below). The Goblin's
  is a **1/5 Steel Sword** (melee, +5 power); verified ~19.7% over 40k fights.
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
- Character **stats are now live** (see below): the app seeds from the bundled
  snapshot (`data/145906-latest.json`), then replaces it with a live Supabase
  read. Without the `web/.env` anon pair it stays on the snapshot.

### Shared logic
- `lib/core.mjs` holds the **pure, browser-safe** xp/level/combat/character
  logic. Both the Node scripts and the web app import it (single source of
  truth). `lib/levels.mjs` / `lib/character.mjs` are thin Node wrappers.

### Boss ladder — ✅ done
- The single Goblin fight is now a **5-rung ladder** with scaling difficulty:
  **Goblin → Giant Rat → Skeleton → Hobgoblin → Lesser Demon** (capstone). Each
  rung scales hp / maxHit / accuracy; data lives in `BOSS_LADDER` in
  `web/src/game/combat.js` (with `BOSSES`/`bossById` + a `nextBoss` helper).
- **Progression**: beating a boss advances the team to the next rung; losing
  retries the same one; clearing the Demon loops back to the Goblin (victory
  lap). Logic is in `App.reset` (win → `nextBoss`, loss → same boss). Because
  the current boss is part of the persisted battle state, **ladder progress
  survives reloads / is per team**.
- **Drops span styles**: each new boss drops one higher-tier weapon —
  Rat → Oak Shortbow (ranged t2), Skeleton → Apprentice Wand (magic t2),
  Hobgoblin → Mithril Sword (melee t3), Demon → Infernal Staff (magic t3) — all
  in `web/src/game/weapons.js`, auto-equipped by the existing tier logic.
- **Sprites**: 4 new original chibi SVGs (Giant Rat, Skeleton, Hobgoblin, Lesser
  Demon) in `Sprite.jsx`, picked by `BossSprite({ id })`. Battle UI messaging is
  ladder-aware ("A Skeleton bars the way ahead...", "conquered the boss ladder
  🏆", NEXT/RETRY button).

### Live character stats — ✅ done
- Battle STATS now reflect each team's **current** pooled WOM gains, read live
  from Supabase (`team_skills` / `team_bosses`) instead of only the build-time
  snapshot. `web/src/game/character.js` gained `loadTeamCharacterLive`
  (browser anon read, mirrors `lib/character.mjs`'s `fetchCharacter`).
- **Seed-then-replace**: `App.jsx` renders the snapshot character instantly,
  then swaps in the live read per team when it resolves (`charByTeam`). Order in
  the hydration effect is live-character → gear → battle, so a resumed fight is
  rebuilt with current stats. `reset` uses the live character too.
- Degrades cleanly: no `web/.env` (or a failed read) → stays on the snapshot.
- **Freshness is automated**: the `Refresh WOM data` GitHub Action
  (`.github/workflows/refresh-wom.yml`) re-runs `fetch → sync` every 30 min and
  is manually runnable from the Actions tab (`Run workflow`) for live demos.
  Needs repo secrets `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (optional
  `WOM_API_KEY`). ⚠️ Scheduled/manual runs only work once the workflow is on
  the **default branch** — merge this branch to `main` and add the secrets to
  activate it.

### Resume mid-battle (battle-state persistence) — ✅ done
- Closing the app mid-fight and returning **resumes the same battle** — enemy
  HP, hero HP, round number and combat log all restored. Battle state is now
  **per team** (`battleByTeam` in `App.jsx`), so switching teams also preserves
  each team's fight in-session, and Supabase persists it across reloads/players.
- New pieces: `web/src/game/battle.js` (`loadBattle`/`saveBattle`, same graceful
  fallback as gear), `rehydrateBattle` + a `BOSSES`/`bossById` registry in
  `web/src/game/combat.js`, migration `supabase/migrations/0003_team_battle.sql`.
- Only the **volatile** state is stored (round, status, boss id + hp, player hp,
  equipped weapon id, log). Boss stats, sprites and styles are rebuilt from code
  + the live character on read, and HP bars are clamped to current maxima — so a
  balance/art change or a level-up is never frozen into a stale saved blob.
- **⚠️ Migration `0003_team_battle.sql` is NOT applied yet** — run it in the
  Supabase SQL Editor to turn on cross-reload persistence (uses the same
  `VITE_SUPABASE_*` anon pair, no new env vars). Until then battle state falls
  back to session-only, exactly like gear does without its table.
- Same anon-key tradeoff as gear: writes are open, so two players fighting the
  same team at once will clobber each other's saved battle. Intended for a
  shared character; revisit with auth if needed.

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
  - **Boss ladder** (new): **Giant Rat** (brown fur, round ears, snout, whiskers,
    buck teeth, curling pink tail), **Skeleton** (bone-white skull + eye sockets,
    ribcage, limb bones), **Hobgoblin** (bulkier muddy-green goblin with warpaint,
    tusks, big club + hide loincloth), **Lesser Demon** (red skin, bone horns,
    leathery wings, glowing flame eyes, clawed hands). Picked by
    `BossSprite({ id })`.
- Bronze/amber accents tie the sprites into the gold "High Society" theme.
- **Logo still TODO:** drop the real logo art in as `web/public/logo.png`
  (transparent PNG, ~360px wide). Until then the header shows a styled gold
  "High Society Scape" wordmark fallback.

## Suggested next steps (pick one)
1. **More gear + drop tables** — the ladder added melee/ranged/magic drops up to
   tier 3, but coverage is uneven (ranged stops at t2) and there's no
   armour/defence yet — combat only uses weapon `power`. Expand `weapons.js`
   (fill the tier gaps, add armour with a defence stat the combat engine reads).
   Auto-equip already picks the highest `tier` per style.
2. **Balance pass** — boss hp/accuracy/maxHit and drop rates in `BOSS_LADDER`
   are first-guess numbers. For maxed demo teams (Team 1 is combat 111) even the
   Demon dies fast; tune the curve once real play shows how it feels.
3. **Deploy** — configs are committed (`netlify.toml` / `vercel.json`): import
   the repo on Netlify or Vercel, add the two `VITE_SUPABASE_*` env vars, done.
   Build runs from the repo root (not `web/`) so the shared `../lib` imports
   resolve → publishes `web/dist`. See README "Deploy it live". Not deployed yet.
   (Also add the Action secrets — see "Live character stats" — to keep the
   deployed app's stats fresh.)

## Open questions to raise with Boris
- Drop-table / gear design at scale: a 5-boss ladder now drops weapons up to
  tier 3, but ranged stops at t2 and there's no armour/defence yet. What tiers,
  rates, and armour do we want across the ladder?
- Boss-ladder balance: `BOSS_LADDER` hp/accuracy/maxHit and drop rates are
  first-guess numbers; maxed demo teams clear even the Demon fast. Tune later.
- Character stats are live from Supabase and auto-refresh every 30 min via the
  Action (resolved). Interval can be tuned in `.github/workflows/refresh-wom.yml`.
- Auth: gear + battle writes use the public anon key (anyone can overwrite). Add
  auth before this goes wide?

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
