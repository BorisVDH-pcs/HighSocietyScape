// Turn-based combat engine. Pure-ish: each call returns a NEW battle state so
// React can render from it. Stats derive from the team's virtual levels; the
// EQUIPPED WEAPON decides which style an attack uses (melee/ranged/magic).
// Overflow xp grants no bonus, per the confirmed pooling policy.

import { DEFAULT_WEAPON, weaponById } from './weapons.js';

// The BOSS LADDER — an ordered progression from a trivial Goblin up to a
// capstone Lesser Demon. Each rung scales hp / maxHit / accuracy (its `level`
// is flavour, shown as :L# in the UI) and drops one higher-tier weapon so the
// climb rewards a real upgrade (auto-equipped by tier — see weapons.js).
// `drops` is rolled once on victory; `chance` is the per-kill probability.
//
// Beating a boss advances the team to the next rung (see nextBoss); losing
// retries the same one. A brand-new team starts at the first rung (the Goblin).
export const BOSS_LADDER = [
  {
    id: 'goblin',
    name: 'Goblin',
    level: 2,
    maxHp: 55,
    maxHit: 4,
    accuracy: 0.45,
    blurb: 'A snivelling green nuisance. Every hero starts somewhere.',
    drops: [{ weaponId: 'steel_sword', chance: 1 / 5 }],
  },
  {
    id: 'giant_rat',
    name: 'Giant Rat',
    level: 7,
    maxHp: 85,
    maxHit: 6,
    accuracy: 0.52,
    blurb: 'A mangy, dog-sized rodent with a taste for adventurers.',
    drops: [{ weaponId: 'oak_shortbow', chance: 1 / 4 }],
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    level: 25,
    maxHp: 140,
    maxHit: 9,
    accuracy: 0.6,
    blurb: 'A rattling pile of bones that refuses to stay buried.',
    drops: [{ weaponId: 'apprentice_wand', chance: 1 / 5 }],
  },
  {
    id: 'hobgoblin',
    name: 'Hobgoblin',
    level: 42,
    maxHp: 210,
    maxHit: 13,
    accuracy: 0.66,
    blurb: 'A hulking cousin of the goblin — bigger, meaner, club in hand.',
    drops: [{ weaponId: 'mithril_sword', chance: 1 / 6 }],
  },
  {
    id: 'lesser_demon',
    name: 'Lesser Demon',
    level: 82,
    maxHp: 320,
    maxHit: 18,
    accuracy: 0.72,
    blurb: 'A towering horned fiend wreathed in flame. The final rung.',
    drops: [{ weaponId: 'infernal_staff', chance: 1 / 8 }],
  },
];

// First rung, exported as GOBLIN for back-compat (initBattle's default etc.).
export const GOBLIN = BOSS_LADDER[0];

// Boss registry — lets a persisted battle (which stores only a boss id) resolve
// back to the full boss definition on resume. Unknown ids fall back to GOBLIN.
export const BOSSES = Object.fromEntries(BOSS_LADDER.map((b) => [b.id, b]));
export const bossById = (id) => BOSSES[id] ?? GOBLIN;

/**
 * The next rung after a given boss id, or null if it's the last (ladder
 * cleared). Used on victory to advance the team's fight.
 */
export function nextBoss(bossId) {
  const i = BOSS_LADDER.findIndex((b) => b.id === bossId);
  if (i === -1 || i === BOSS_LADDER.length - 1) return null;
  return BOSS_LADDER[i + 1];
}

/** Roll a boss's drop table on kill. Returns the weapon ids that dropped. */
function rollDrops(boss) {
  const dropped = [];
  for (const d of boss.drops ?? []) {
    if (Math.random() < d.chance) dropped.push(d.weaponId);
  }
  return dropped;
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

export function initBattle(character, boss = GOBLIN, weapon = DEFAULT_WEAPON) {
  const p = playerProfile(character);
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
 * Starts from a fresh initBattle for the CURRENT boss + character + weapon — so
 * stats, sprites and styles reflect today's code and the live levels — then
 * overlays the saved volatile state: round, status, both HP bars (clamped to
 * the current maxima, so a level-up that raised max HP can't leave a stale
 * over-max value) and the combat log. `saved` is the shape loadBattle returns.
 * `weapon` (from the team's persisted gear) wins over the snapshot's stored
 * weapon id, keeping the resumed fight consistent with the equipped loadout.
 */
export function rehydrateBattle(character, saved, weapon = null) {
  const boss = bossById(saved.bossId);
  const w = weapon ?? weaponById(saved.weaponId);
  const base = initBattle(character, boss, w);
  base.round = saved.round ?? 0;
  base.status = saved.status ?? 'active';
  base.boss.hp = clamp(saved.bossHp ?? base.boss.maxHp, 0, base.boss.maxHp);
  base.player.hp = clamp(saved.playerHp ?? base.player.maxHp, 0, base.player.maxHp);
  if (Array.isArray(saved.log) && saved.log.length) base.log = saved.log;
  return base;
}

/** Swap the equipped weapon mid-fight (changes which style Attack uses). */
export function equipWeapon(state, weapon) {
  if (state.player.weapon.id === weapon.id) return state;
  const s = structuredClone(state);
  s.player.weapon = weapon;
  if (s.status === 'active') {
    s.log = [...s.log, { t: 'info', text: `${s.player.name} equips the ${weapon.name}.` }];
  }
  return s;
}

const rollDamage = (maxHit) => Math.floor(Math.random() * (maxHit + 1));
const lands = (accuracy) => Math.random() < accuracy;

/**
 * Advance one full round: the player attacks with the chosen style, then — if
 * still standing — the boss retaliates. Returns a new state.
 */
export function attack(state) {
  if (state.status !== 'active') return state;

  const s = structuredClone(state);
  const style = s.player.styles[s.player.weapon.style];
  const noun = style.label.toLowerCase();
  s.round += 1;
  const entries = [];

  // --- Player turn ---
  if (lands(style.accuracy)) {
    const dmg = rollDamage(style.maxHit + (s.player.weapon.power ?? 0));
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
      entries.push({ t: 'loot', text: `The ${s.boss.name} dropped a ${weaponById(id).name}!` });
    }
    s.log = [...s.log, ...entries];
    return s;
  }

  // --- Boss turn ---
  if (lands(s.boss.accuracy)) {
    const dmg = rollDamage(s.boss.maxHit);
    s.player.hp = Math.max(0, s.player.hp - dmg);
    entries.push({
      t: 'boss',
      text: dmg
        ? `The ${s.boss.name} hits ${s.player.name} for ${dmg}.`
        : `The ${s.boss.name} swings at ${s.player.name} — 0 damage.`,
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
