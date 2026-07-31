// Turn-based combat engine. Pure-ish: each call returns a NEW battle state so
// React can render from it. Stats derive from the team's virtual levels; the
// EQUIPPED SETUP (weapon + armour/boots/cape/amulet/ring for the active style)
// decides the attack style and adds combat bonuses:
//   power    -> added to the player's max hit
//   accuracy -> added to the player's hit chance (capped)
//   defence  -> mitigates incoming boss damage (see DEF_FACTOR)
// Overflow xp grants no bonus, per the confirmed pooling policy.

import {
  DEFAULT_WEAPON,
  itemById,
  weaponOf,
  gearId,
  setupStats,
} from './weapons.js';

// How much each point of defence shaves off a boss hit. Balance-tuned
// (2026-07-31, "grindy" target) alongside the boss stats below and the gear
// formulas in weapons.js — this is the single knob for how much armour matters.
// Lowered from 0.5 so armour helps but never trivialises a fight.
const DEF_FACTOR = 0.35;

// The BOSS LADDER — an ordered progression from a trivial Goblin up to the King
// Black Dragon. Each rung scales hp / maxHit / accuracy (its `level` is flavour,
// shown as :L# in the UI). Drop tables are generated below from BOSS_LOOT.
// Beating a boss advances the team to the next rung; losing retries the same
// one. A brand-new team starts at the first rung (the Goblin). `map: {x, y}` is
// each boss's position on the draggable world map (see components/BossMap.jsx).
//
// Stats are BALANCE-TUNED (2026-07-31), not first-guess. The player is hard-
// capped (HP 99, max hit ~53 fully geared), so maxHit/maxHp are deliberately
// compressed to fit UNDER those caps — a boss maxHit in the 40s is simply
// unwinnable for a 99-HP hero, which is why the old ladder's top rungs (maxHit
// up to 45, HP up to 1000) could not be beaten with any gear. Simulated (20k
// fights/rung, melee, level-99 hero) win rates for a team wearing the best gear
// they'd have FARMED entering each rung, target "grindy": 100 / 100 / 100 / 100
// / 89 / 77 / 68 / 60 / 49 / 39%. An under-geared (starter) team hits a wall at
// the Hobgoblin (~54%) and 0% from the Lesser Demon on — so gearing up is
// mandatory to climb. Tune together with DEF_FACTOR (above) and the GEAR_SLOTS
// stat formulas + BOSS_LOOT drop rates.
export const BOSS_LADDER = [
  { id: 'goblin',           name: 'Goblin',           level: 2,   maxHp: 45,   maxHit: 6,  accuracy: 0.55, blurb: 'A snivelling green nuisance. Every hero starts somewhere.', map: { x: 90,   y: 240 } },
  { id: 'giant_rat',        name: 'Giant Rat',        level: 7,   maxHp: 85,   maxHit: 8,  accuracy: 0.60, blurb: 'A mangy, dog-sized rodent with a taste for adventurers.',   map: { x: 270,  y: 130 } },
  { id: 'skeleton',         name: 'Skeleton',         level: 25,  maxHp: 125,  maxHit: 10, accuracy: 0.63, blurb: 'A rattling pile of bones that refuses to stay buried.',      map: { x: 450,  y: 250 } },
  { id: 'hobgoblin',        name: 'Hobgoblin',        level: 42,  maxHp: 180,  maxHit: 13, accuracy: 0.67, blurb: 'A hulking cousin of the goblin — bigger, meaner, club in hand.', map: { x: 640,  y: 130 } },
  { id: 'lesser_demon',     name: 'Lesser Demon',     level: 82,  maxHp: 350,  maxHit: 17, accuracy: 0.71, blurb: 'A towering horned fiend wreathed in flame.',                  map: { x: 820,  y: 250 } },
  { id: 'fire_giant',       name: 'Fire Giant',       level: 86,  maxHp: 355,  maxHit: 18, accuracy: 0.72, blurb: 'A mountain of molten muscle. The ground scorches where it treads.', map: { x: 1000, y: 130 } },
  { id: 'green_dragon',     name: 'Green Dragon',     level: 120, maxHp: 545,  maxHit: 20, accuracy: 0.74, blurb: 'A winged serpent that answers challengers with a gout of flame.', map: { x: 1180, y: 250 } },
  { id: 'frost_troll',      name: 'Frost Troll',      level: 140, maxHp: 570,  maxHit: 20, accuracy: 0.75, blurb: 'A hulking brute of living ice from the frozen north.',        map: { x: 1360, y: 130 } },
  { id: 'abyssal_demon',    name: 'Abyssal Demon',    level: 165, maxHp: 550,  maxHit: 21, accuracy: 0.77, blurb: 'A teleporting horror wielding a whip of living shadow.',      map: { x: 1540, y: 250 } },
  { id: 'king_black_dragon',name: 'King Black Dragon',level: 276, maxHp: 760,  maxHit: 22, accuracy: 0.79, blurb: 'The three-headed tyrant of the ladder. Beat it and you rule the scape.', map: { x: 1720, y: 150 } },
];

// Each boss drops the (style, tier) gear set shown here. `rate` is the per-kill
// chance for each piece — deliberately low so a full set takes some grinding.
// The weapon is a touch rarer than the armour pieces. TUNE later.
const BOSS_LOOT = {
  goblin:            { style: 'melee',  tier: 2, rate: 1 / 28 },
  giant_rat:         { style: 'ranged', tier: 2, rate: 1 / 26 },
  skeleton:          { style: 'magic',  tier: 2, rate: 1 / 30 },
  hobgoblin:         { style: 'melee',  tier: 3, rate: 1 / 38 },
  lesser_demon:      { style: 'magic',  tier: 3, rate: 1 / 45 },
  fire_giant:        { style: 'melee',  tier: 4, rate: 1 / 55 },
  green_dragon:      { style: 'ranged', tier: 3, rate: 1 / 50 },
  frost_troll:       { style: 'magic',  tier: 4, rate: 1 / 60 },
  abyssal_demon:     { style: 'melee',  tier: 5, rate: 1 / 80 },
  king_black_dragon: { style: 'ranged', tier: 4, rate: 1 / 90 },
};

const DROP_SLOTS = ['armour', 'boots', 'cape', 'amulet', 'ring'];

// Attach a generated drop table to each boss (weapon + the five gear pieces).
for (const boss of BOSS_LADDER) {
  const loot = BOSS_LOOT[boss.id];
  if (!loot) {
    boss.drops = [];
    continue;
  }
  const { style, tier, rate } = loot;
  const drops = [];
  const weapon = weaponOf(style, tier);
  if (weapon) drops.push({ itemId: weapon.id, chance: rate * 0.8 });
  for (const slot of DROP_SLOTS) drops.push({ itemId: gearId(style, slot, tier), chance: rate });
  boss.drops = drops;
}

// The virtual world the map pans across. Grows as bosses are added further out.
export const MAP_WORLD = { w: 1820, h: 380 };

// First rung, exported as GOBLIN for back-compat (initBattle's default etc.).
export const GOBLIN = BOSS_LADDER[0];

// Boss registry — lets a persisted battle (which stores only a boss id) resolve
// back to the full boss definition on resume. Unknown ids fall back to GOBLIN.
export const BOSSES = Object.fromEntries(BOSS_LADDER.map((b) => [b.id, b]));
export const bossById = (id) => BOSSES[id] ?? GOBLIN;

/** A boss's position on the ladder (0-based), or -1 if unknown. */
export const bossIndex = (bossId) => BOSS_LADDER.findIndex((b) => b.id === bossId);

/**
 * The next rung after a given boss id, or null if it's the last (ladder
 * cleared). Used to work out which boss beating this one unlocks.
 */
export function nextBoss(bossId) {
  const i = bossIndex(bossId);
  if (i === -1 || i === BOSS_LADDER.length - 1) return null;
  return BOSS_LADDER[i + 1];
}

/**
 * Roll a boss's drop table on kill: ONE roll per kill, yielding at most one
 * item. A single random draw walks the table's cumulative chances — it lands in
 * one piece's band (that piece drops) or past them all (nothing). Each piece
 * keeps its own per-kill probability; total drop chance is the sum. Returns an
 * array of 0 or 1 item ids (array kept for the caller's loot loop).
 */
function rollDrops(boss) {
  let r = Math.random();
  for (const d of boss.drops ?? []) {
    if (r < d.chance) return [d.itemId];
    r -= d.chance;
  }
  return [];
}

/** Derive the player's combat profile from a character view model. */
export function playerProfile(character) {
  const lvl = (k) => character.skills?.[k]?.level ?? 1;
  // label = button text / noun; verb = present-tense verb for the combat log.
  const style = (name, label, verb, level, acc) => ({
    key: name,
    label,
    verb,
    level,
    maxHit: Math.max(1, Math.floor(level / 8)), // e.g. 99 -> 12
    accuracy: acc,
  });
  return {
    hp: lvl('hitpoints'),
    styles: {
      melee: style('melee', 'Slash', 'slashes', Math.max(lvl('attack'), lvl('strength')), 0.9),
      ranged: style('ranged', 'Shoot', 'shoots', lvl('ranged'), 0.9),
      magic: style('magic', 'Blast', 'blasts', lvl('magic'), 0.85),
    },
  };
}

/**
 * Build a fresh battle. `setup` is the six-slot equipped setup for the active
 * style (see weapons.buildSetup); its weapon sets the attack style and its
 * aggregate stats become the player's combat bonuses. A bare weapon or nothing
 * is tolerated (falls back to the default weapon, no bonuses).
 */
export function initBattle(character, boss = GOBLIN, setup = null) {
  const p = playerProfile(character);
  const s = setup && setup.weapon ? setup : { weapon: DEFAULT_WEAPON };
  const weapon = s.weapon ?? DEFAULT_WEAPON;
  const bonus = setupStats(s);
  return {
    round: 0,
    status: 'active', // 'active' | 'won' | 'lost'
    boss: { ...boss, hp: boss.maxHp },
    player: {
      name: character.team,
      combatLevel: character.combatLevel,
      maxHp: p.hp,
      hp: p.hp,
      styles: p.styles,
      weapon,
      setup: s,
      bonus,
    },
    log: [
      {
        t: 'info',
        text: `A ${boss.name} blocks the path. ${character.team} (combat ${character.combatLevel}) draws the ${weapon.name}.`,
      },
    ],
  };
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Rebuild a playable battle from a persisted snapshot (see game/battle.js).
 * Starts from a fresh initBattle for the CURRENT boss + character + setup — so
 * stats, sprites and styles reflect today's code and the live levels — then
 * overlays the saved volatile state: round, status, both HP bars (clamped to
 * the current maxima) and the combat log. `setup` (from the team's persisted
 * gear) decides the weapon/bonuses of the resumed fight.
 */
export function rehydrateBattle(character, saved, setup = null) {
  const boss = bossById(saved.bossId);
  const base = initBattle(character, boss, setup);
  base.round = saved.round ?? 0;
  base.status = saved.status ?? 'active';
  base.boss.hp = clamp(saved.bossHp ?? base.boss.maxHp, 0, base.boss.maxHp);
  base.player.hp = clamp(saved.playerHp ?? base.player.maxHp, 0, base.player.maxHp);
  if (Array.isArray(saved.log) && saved.log.length) base.log = saved.log;
  return base;
}

const rollDamage = (maxHit) => Math.floor(Math.random() * (maxHit + 1));
const lands = (accuracy) => Math.random() < accuracy;

/**
 * Advance one full round: the player attacks with the active style (boosted by
 * gear power/accuracy), then — if still standing — the boss retaliates, its hit
 * reduced by the player's defence. Returns a new state.
 */
export function attack(state) {
  if (state.status !== 'active') return state;

  const s = structuredClone(state);
  const style = s.player.styles[s.player.weapon.style];
  const bonus = s.player.bonus ?? { power: 0, defence: 0, accuracy: 0 };
  const noun = style.label.toLowerCase();
  s.round += 1;
  const entries = [];

  // --- Player turn ---
  const hitChance = Math.min(0.99, style.accuracy + (bonus.accuracy ?? 0));
  if (lands(hitChance)) {
    const dmg = rollDamage(style.maxHit + (bonus.power ?? 0));
    s.boss.hp = Math.max(0, s.boss.hp - dmg);
    entries.push({
      t: 'player',
      text: dmg
        ? `${s.player.name} ${style.verb} the ${s.boss.name} for ${dmg}.`
        : `${s.player.name}'s ${noun} grazes the ${s.boss.name} — 0 damage.`,
    });
  } else {
    entries.push({ t: 'miss', text: `${s.player.name}'s ${noun} misses.` });
  }

  if (s.boss.hp <= 0) {
    s.status = 'won';
    entries.push({ t: 'win', text: `The ${s.boss.name} collapses. Victory! ⚔️` });
    // Roll the boss's drop table.
    s.loot = rollDrops(s.boss);
    for (const id of s.loot) {
      entries.push({ t: 'loot', text: `The ${s.boss.name} dropped a ${itemById(id)?.name ?? id}!` });
    }
    s.log = [...s.log, ...entries];
    return s;
  }

  // --- Boss turn ---
  if (lands(s.boss.accuracy)) {
    const raw = rollDamage(s.boss.maxHit);
    const dmg = Math.max(0, raw - Math.floor((bonus.defence ?? 0) * DEF_FACTOR));
    s.player.hp = Math.max(0, s.player.hp - dmg);
    entries.push({
      t: 'boss',
      text: dmg
        ? `The ${s.boss.name} hits ${s.player.name} for ${dmg}.`
        : `The ${s.boss.name}'s blow glances off ${s.player.name}'s armour — 0 damage.`,
    });
  } else {
    entries.push({ t: 'miss', text: `The ${s.boss.name} misses.` });
  }

  if (s.player.hp <= 0) {
    s.status = 'lost';
    entries.push({ t: 'lose', text: `${s.player.name} has fallen...` });
  }

  s.log = [...s.log, ...entries];
  return s;
}
