# HANDOVER — resuming HighSocietyScape

Read **`CLAUDE.md`** first for the concept/architecture, then **`README.md`**
for setup and run commands. This file is the live status + what to do next.

_Last updated: 2026-07-31._

---

## ⭐ 2026-07-31 update — current state (read this first)

This supersedes any "not applied / not deployed / no armour" notes further down.

### Balance-tuning pass — ✅ DONE (2026-07-31, "grindy" target)
- **The old ladder was unwinnable, not "too easy."** A simulation of the real
  combat math (20k fights/rung, level-99 hero, best-farmed gear) showed the top
  three bosses at **19% / 0.7% / 0%** win even with the *full best gear set in
  the game* — because the player is hard-capped (HP 99, max hit ~53) while boss
  HP scaled to 1000 and boss maxHit to 45. No gear or leveling could close that.
- **Fix:** boss `maxHp`/`maxHit`/`accuracy` are **compressed to fit under the
  player caps** (maxHit ladder now 6→22, not 6→45; HP 45→760, not 55→1000), and
  `DEF_FACTOR` lowered **0.5 → 0.35** (armour helps, never trivialises). Gear
  formulas in `weapons.js` were left as-is — the ladder was tuned *around* them.
- **Resulting curve** (simulated, team wearing the gear they'd have FARMED
  entering each rung — Boris chose "grindy/punishing"):
  Goblin→Hobgoblin **100%**, Lesser Demon **89%**, Fire Giant **77%**, Green
  Dragon **68%**, Frost Troll **60%**, Abyssal Demon **49%**, **KBD 39%**
  (the capstone wall). Strictly monotonic. An **under-geared** (starter-only)
  team wins the first three, stalls at the Hobgoblin (~54%) and hits **0% from
  the Lesser Demon on** — so gearing up is now *mandatory* to climb.
- Tuning knobs, all centralised: `BOSS_LADDER` stats + `DEF_FACTOR` in
  `combat.js`, `GEAR_SLOTS`/weapon powers in `weapons.js`, `BOSS_LOOT` drop
  rates in `combat.js`. The PowerShell sim used to tune this is in the session
  scratchpad (not committed) — reproduce it if you re-tune.
- **Drop rates (`BOSS_LOOT`) left unchanged** — the low per-piece rates
  (1/26–1/90) already suit the grindy target; retune if the farm feels too long.
- **⚠️ Not yet verified on the live Netlify deploy** at time of writing — push
  and hard-reload to confirm the numbers feel right in-app.

- **The app is DEPLOYED and LIVE on Netlify**, auto-redeploying on every push to
  `main`. Cloud save is **on**.
- **Supabase env is set in `netlify.toml`** (`[build.environment]`), NOT the
  Netlify dashboard — the free plan has no dashboard env-var access. Both values
  are the PUBLIC anon pair (safe in-repo; RLS protects the data). To retarget a
  project, edit the two `VITE_SUPABASE_*` values there. A local `web/.env` also
  exists on Boris's machine for local dev.
- **All migrations are APPLIED** to the live DB: `0001_init`, `0002_team_gear`,
  `0003_team_battle`, `0004_team_progress`. (An earlier stray `0002_game_state.sql`
  from a parallel effort was dropped — those `team_inventory`/`team_loadout`/etc.
  tables no longer exist and are not used.)
- **⚠️ Boris's laptop CANNOT run Node** (install blocked). The web app therefore
  **cannot be built or tested locally** here — every change is verified by pushing
  and checking the **Netlify deploy** (hard-reload / "Empty Cache and Hard Reload"
  to bust the cache; a plain reload often serves the stale build). The Netlify
  URL isn't recorded here — ask Boris for it if you need to inspect the live site.
- **PowerShell gotcha:** `Invoke-WebRequest`/`Invoke-RestMethod` returns a
  spurious **401** when sending the `sb_secret_` key as a Bearer token. Use
  `curl.exe` (or Node fetch) for Supabase calls — those authenticate fine.

### Drop-rate info panel — ✅ DONE (2026-07-31, pushed)
- An **ⓘ button** sits in the enemy info box (top-left, right of the boss
  name/level). Tapping it toggles a **drops overlay** over the battle scene
  listing every possible drop for the *current* boss — icon + name + per-kill
  chance formatted as `1/N · P%` — read straight from `boss.drops` (the table
  generated from `BOSS_LOOT`). Close with ✕ or by tapping ⓘ again.
- All in `web/src/components/BattleScreen.jsx` (`showDrops` state, `formatRate`
  helper, the `.drops-overlay` block) + styles in `web/src/styles.css`
  (`.dropinfo-btn`, `.drops-overlay`, `.drop-row`, …). Purely additive UI —
  combat/drop logic untouched.
- **⚠️ Pushed but not yet verified on the live Netlify deploy** — hard-reload
  and confirm the button + panel render correctly (esp. on mobile width).

### Gear system — now SIX slots per style (2026-07-31)
- GEAR is no longer weapon-only. Every piece is an item with a `slot`
  (**weapon, armour, boots, cape, amulet, ring**), a `style`, a `tier`, and stat
  bonuses: `power` (max hit), `defence` (mitigates boss damage), `accuracy` (hit
  chance). Registry + helpers (`buildSetup`, `setupStats`, `bestOwnedBySlot`,
  `itemById`, generated gear) live in `web/src/game/weapons.js`.
- **GEAR → Melee/Ranged/Mage** activates that style AND opens its **SET-UP panel**
  listing all six equipped slots + aggregate stats (`BattleScreen.jsx`). Best
  owned piece per slot is auto-equipped; no manual inventory. Starter tier-1 set
  (all slots, all styles) is always owned.
- **Gear drops from bosses** (confirmed choice): each boss drops its (style,tier)
  set at low rates (~1/26–1/90 per piece, weapon ~20% rarer). `owned_ids` stores
  armour ids too — **no schema change**. Drop tables generated from `BOSS_LOOT`
  in `combat.js`.
- **Combat uses the gear:** max hit += Σpower, hit chance += Σaccuracy (capped
  0.99), boss damage −= floor(Σdefence × `DEF_FACTOR` [now **0.35**]). Boss
  stats have since been **balance-tuned** to fit the player caps (see the
  Balance-tuning pass section at the top) — the earlier "gear only makes fights
  easier, never unwinnable" claim was wrong; the top rungs had been *unwinnable*.
- **One loot roll per kill** (fixed 2026-07-31): a single cumulative-probability
  draw yields at most one item; each piece keeps its own odds.

### Attack animations + pace (2026-07-31)
- Each round plays a two-phase animation: player swings (melee lunge) / shoots
  (arrow projectile) / casts (spell projectile) and the boss recoils, then the
  boss lunges into the hero and it recoils. Driven by an `action` descriptor
  (monotonic `seq`) from `App.jsx` → timeline effect in `BattleScreen.jsx`; CSS
  keyframes in `styles.css`. Auto-fight cadence slowed 300ms → `ROUND_MS` (1200ms).
- **Known rough edge (for the polish/balance pass):** HP bars update instantly at
  round start while the boss lunge animates ~0.9s later, so HP can visibly drop
  slightly *before* the boss's blow lands. Syncing HP to each blow needs the
  engine to expose intermediate states — deferred, not yet done.

### Bug fixed this session
- **Boss-map nodes were unselectable on desktop (mouse):** `BossMap` called
  `setPointerCapture` on pointerdown, which redirected pointerup off the boss
  buttons and killed their click. Now capture is deferred until a real drag
  (past the slop threshold), so taps click normally. (Touch was unaffected.)

---

## Where we are

The project has gone from "pipeline never run" to **a working data pipeline +
a playable, themed battle screen** with **live character stats**, a **10-boss
progression ladder** (Goblin → … → King Black Dragon) on a **draggable world
map**, **per-team gear AND battle
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
  player info + HP bottom-right, **FIGHT / GEAR / ITEM / MAP** command box plus
  an **AUTO-FIGHT** toggle.
- **Command box is a FIXED size** (`.cmdbox height` in `styles.css`) so it never
  resizes as the message/menu changes; the message font is small (8px) and the
  box clips rather than reflowing. The **AUTO-FIGHT** control is a distinct
  filled button (dark when off, alert-red "STOP AUTO" when running) so it stands
  apart from the plain text commands.
- The footer shows only the **cloud-save indicator** (`☁ Cloud save on` /
  `⚠ Session only`) — the old "derived from WOM data" blurb was removed.
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
- The single Goblin fight is now a **10-rung ladder** with scaling difficulty:
  **Goblin → Giant Rat → Skeleton → Hobgoblin → Lesser Demon → Fire Giant →
  Green Dragon → Frost Troll → Abyssal Demon → King Black Dragon** (capstone,
  3-headed). Each rung scales hp / maxHit / accuracy; data lives in `BOSS_LADDER`
  in `web/src/game/combat.js` (with `BOSSES`/`bossById` + `nextBoss`/`bossIndex`).
- **Progression is manual (you stay on a boss to farm drops)**: after a win OR
  loss the post-battle button re-fights the **same** boss (`App.reset`). You
  move between bosses yourself via the **MAP** (`App.selectBoss`).
- **MAP is a draggable world map** (`web/src/components/BossMap.jsx`), not a
  list: boss nodes (mini `BossSprite` + name + level) sit at coordinates in a
  world larger than the viewport, connected by a trail; you drag / swipe (pointer
  events, clamped pan) to explore, and it opens centred on the current boss.
  Tap an unlocked node to travel there. Coordinates + world size live in
  `BOSS_LADDER[].map` / `MAP_WORLD` in `combat.js` — **adding bosses is just
  more coordinates further out**, which was the point (room to grow well past 5).
- **Unlock gating**: bosses unlock in order — beating rung i unlocks i+1, and the
  MAP shows later rungs 🔒 locked/greyed until earned. Progress is per team
  (`progressByTeam` / `unlockUpTo` in `App.jsx`, `bossIndex` in `combat.js`) and
  persisted to the **`team_progress`** table via `web/src/game/progress.js`
  (`loadProgress`/`saveProgress`). A resumed fight's boss is always treated as
  unlocked (safety net), and it degrades to session-only when Supabase/the table
  is absent. **⚠️ Needs migration `0004_team_progress.sql` applied** for
  cross-reload persistence.
- **AUTO-FIGHT** is a persistent MODE (`auto` state + effect in `App.jsx`):
  throws one attack every ~300ms until someone hits 0 HP, then stays ARMED — so
  FIGHT AGAIN keeps auto-fighting for hands-off farming. Only STOP or a team
  switch turns it off. The toggle shows on both the active menu and the end
  screen so it's always controllable.
- **MAP replaced RUN** in the command box; the end screen offers FIGHT AGAIN +
  MAP. `nextBoss` still exists in `combat.js` but is no longer used for
  auto-advance.
- **Drops span styles + tiers 1→5**: each boss drops one higher-tier weapon
  (13 weapons total in `web/src/game/weapons.js`, auto-equipped by tier):
  Goblin → Steel Sword (melee t2), Rat → Oak Shortbow (ranged t2),
  Skeleton → Apprentice Wand (magic t2), Hobgoblin → Mithril Sword (melee t3),
  Demon → Infernal Staff (magic t3), Fire Giant → Rune Scimitar (melee t4),
  Green Dragon → Magic Shortbow (ranged t3), Frost Troll → Mystic Staff (magic
  t4), Abyssal Demon → Abyssal Whip (melee t5), KBD → Dragon Crossbow (ranged
  t4). Rates taper from 1/5 down to 1/15 for the capstone.
- **Sprites**: **9 original chibi SVGs** in `Sprite.jsx`, picked by
  `BossSprite({ id })` — Giant Rat, Skeleton, Hobgoblin, Lesser Demon, Fire
  Giant, Green Dragon, Frost Troll, Abyssal Demon, and the 3-headed King Black
  Dragon (rendered + eyeballed).

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
- **Persistence requires `web/.env`** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`,
  read by Vite at dev-server startup / build time). Without them gear, battle
  and boss progress are **session-only** and reset when the app is fully closed.
  The footer now shows a **cloud-save indicator** (`☁ Cloud save on` vs
  `⚠ Session only`) so it's obvious which mode you're in.
- **StrictMode load bug — fixed (2026-07-30)**: the hydration effect marked a
  team "loaded" *before* the async ran, so React 18/19 StrictMode's dev
  mount→unmount→remount cancelled the first run and skipped the second — nothing
  loaded and progress looked reset on every reload. The flag is now set only
  after a completed load. (Prod builds don't double-invoke, so this hit dev.)
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
  - **Boss ladder** (all original, picked by `BossSprite({ id })`): **Giant Rat**
    (brown fur, round ears, whiskers, curling pink tail), **Skeleton** (skull +
    ribcage + limb bones), **Hobgoblin** (bulkier warpainted goblin, tusks,
    club), **Lesser Demon** (red, bone horns, leathery wings, flame eyes),
    **Fire Giant** (molten-orange giant, flame crest, big fists), **Green Dragon**
    (winged green serpent, cream belly, horned head), **Frost Troll** (icy-blue
    brute, shoulder ice-spikes, tusks), **Abyssal Demon** (floating purple fiend,
    bat wings, red eyes, whip tendril), **King Black Dragon** (3-headed black
    dragon capstone, red eyes, spiked wings).
- Bronze/amber accents tie the sprites into the gold "High Society" theme.
- **Logo still TODO:** drop the real logo art in as `web/public/logo.png`
  (transparent PNG, ~360px wide). Until then the header shows a styled gold
  "High Society Scape" wordmark fallback.

## Suggested next steps (pick one)
1. **Verify the balance pass in-app + fine-tune by feel** — the numbers are
   sim-tuned (see top) but unplayed on the live deploy. Push, hard-reload, and
   sanity-check the difficulty *feels* grindy-not-frustrating; nudge
   `BOSS_LADDER`/`DEF_FACTOR`/`BOSS_LOOT` if a rung feels off. Weaker teams
   (low HP/combat levels) will find it harder than the level-99 sim — decide if
   that's acceptable or if boss stats should scale to the team's combat level.
2. **HP-timing polish** — make the HP bars drop when each blow *lands* (synced to
   the animation) instead of instantly at round start. Needs the combat engine to
   expose intermediate states (player-hit then boss-hit) rather than applying both
   in one `attack()` return.
3. **BAG menu** — the `BAG` command is a placeholder ("coming soon"). Add an
   inventory for potions/food (healing items) — a genuinely new subsystem
   (consumables + a heal action in combat), distinct from the auto-equipped gear.
4. **Armour on the sprite** — the hero sprite still changes by weapon style only;
   equipped armour isn't drawn. Optional visual polish (original 2D art only).

## Open questions to raise with Boris
- **Balance feel:** RESOLVED as a target — Boris chose **grindy/punishing**
  (top bosses ~40–60% win even geared) and the ladder is tuned to it. Still
  **unverified by real play** on the deploy; confirm it feels right, and decide
  whether boss stats should scale to a team's combat level (the tune assumes a
  ~level-99 hero; weaker teams face a harder curve).
- **Gear naming/flavour:** armour/accessory names are auto-generated per style
  tier (e.g. "Studded Ring", "Enchanted Amulet") — placeholders. Want bespoke
  names/icons, or leave generated?
- **Accessories per style:** amulet/ring/cape are currently style-specific (each
  style has its own). Keep that, or make some accessories universal?
- Auth: gear + battle + progress writes use the public anon key (anyone can
  overwrite). Add auth before this goes wide?

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
