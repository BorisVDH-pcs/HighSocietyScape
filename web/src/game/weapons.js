// The gear registry. Every equippable piece is an ITEM with a `slot`
// (weapon/armour/boots/cape/amulet/ring), a combat `style` (melee/ranged/magic),
// a `tier`, and stat bonuses:
//   power    -> added to max hit        (weapon, amulet, cape)
//   defence  -> mitigates boss damage   (armour, boots, cape)
//   accuracy -> added to hit chance     (ring)
// The game always auto-equips the highest tier you OWN in each slot for a style
// (see bestOwnedBySlot / buildSetup) — there is no manual inventory. Starter
// tier-1 pieces are always owned; higher tiers drop from bosses (see combat.js).
// Icons are plain emoji (original 2D only — no ripped Jagex art).
//
// NOTE: stat values here are first-guess and meant to be TUNED later; the whole
// balance (these + boss stats in combat.js) is an open pass.

// ---- Weapons (slot: 'weapon'). power adds to max hit, as before. ----
const WEAPON_DEFS = [
  { id: 'bronze_sword',   name: 'Bronze Sword',   style: 'melee',  icon: '🗡️', power: 0,  tier: 1, desc: 'A starter blade. Scales with Attack & Strength.' },
  { id: 'shortbow',       name: 'Shortbow',       style: 'ranged', icon: '🏹', power: 0,  tier: 1, desc: 'Quick and reliable. Scales with Ranged.' },
  { id: 'novice_staff',   name: 'Novice Staff',   style: 'magic',  icon: '🪄', power: 0,  tier: 1, desc: 'Crackling with power. Scales with Magic.' },
  { id: 'steel_sword',    name: 'Steel Sword',    style: 'melee',  icon: '⚔️', power: 5,  tier: 2, desc: 'A heavier blade looted from goblins.' },
  { id: 'oak_shortbow',   name: 'Oak Shortbow',   style: 'ranged', icon: '🏹', power: 5,  tier: 2, desc: 'A sturdier bow cut from oak.' },
  { id: 'apprentice_wand',name: 'Apprentice Wand',style: 'magic',  icon: '🪄', power: 6,  tier: 2, desc: 'A wand humming with borrowed power.' },
  { id: 'mithril_sword',  name: 'Mithril Sword',  style: 'melee',  icon: '⚔️', power: 11, tier: 3, desc: 'A keen blue-steel blade.' },
  { id: 'infernal_staff', name: 'Infernal Staff', style: 'magic',  icon: '🔥', power: 15, tier: 3, desc: 'A staff crowned with demonfire.' },
  { id: 'magic_shortbow', name: 'Magic Shortbow', style: 'ranged', icon: '🏹', power: 13, tier: 3, desc: 'A bow of enchanted magic wood.' },
  { id: 'rune_scimitar',  name: 'Rune Scimitar',  style: 'melee',  icon: '⚔️', power: 18, tier: 4, desc: 'A curved blade of blue rune metal.' },
  { id: 'mystic_staff',   name: 'Mystic Staff',   style: 'magic',  icon: '🔮', power: 20, tier: 4, desc: 'A staff humming with elemental frost.' },
  { id: 'dragon_crossbow',name: 'Dragon Crossbow',style: 'ranged', icon: '🎯', power: 24, tier: 4, desc: 'A crossbow forged in dragonfire.' },
  { id: 'abyssal_whip',   name: 'Abyssal Whip',   style: 'melee',  icon: '🔗', power: 26, tier: 5, desc: 'A living tendril torn from the abyss.' },
];

// ---- The six equipment slots, in display order. ----
export const SLOTS = ['weapon', 'armour', 'boots', 'cape', 'amulet', 'ring'];

// Per-style tier names. Tier 1 is the starter set; 2..N drop from bosses. Each
// style only reaches the tiers its bosses provide (melee 5, ranged/magic 4).
const TIER_NAMES = {
  melee:  { 1: 'Bronze',  2: 'Steel',        3: 'Mithril', 4: 'Rune',            5: 'Dragon' },
  ranged: { 1: 'Leather', 2: 'Hard Leather', 3: 'Studded', 4: 'Green Dragonhide' },
  magic:  { 1: 'Novice',  2: 'Apprentice',   3: 'Mystic',  4: 'Enchanted' },
};

// Non-weapon slots: their noun, icon, and stat formula by tier t.
const GEAR_SLOTS = {
  armour: { noun: 'Armour', icon: '🛡️', stats: (t) => ({ defence: t * 3 }) },
  boots:  { noun: 'Boots',  icon: '🥾', stats: (t) => ({ defence: t }) },
  cape:   { noun: 'Cape',   icon: '🧣', stats: (t) => ({ defence: t, power: t }) },
  amulet: { noun: 'Amulet', icon: '📿', stats: (t) => ({ power: t * 2 }) },
  ring:   { noun: 'Ring',   icon: '💍', stats: (t) => ({ accuracy: Number((t * 0.01).toFixed(2)) }) },
};

// The canonical id for a generated (non-weapon) gear piece.
export const gearId = (style, slot, tier) => `${style}_${slot}_t${tier}`;

function generateGear() {
  const items = [];
  for (const style of Object.keys(TIER_NAMES)) {
    const tiers = TIER_NAMES[style];
    for (const [slot, def] of Object.entries(GEAR_SLOTS)) {
      for (const tStr of Object.keys(tiers)) {
        const t = Number(tStr);
        items.push({
          id: gearId(style, slot, t),
          name: `${tiers[t]} ${def.noun}`,
          style,
          slot,
          tier: t,
          icon: def.icon,
          ...def.stats(t),
          desc: `${tiers[t]} ${def.noun.toLowerCase()} (${style}).`,
        });
      }
    }
  }
  return items;
}

// The full registry: weapons + generated armour/accessories.
export const GEAR = [
  ...WEAPON_DEFS.map((w) => ({ ...w, slot: 'weapon' })),
  ...generateGear(),
];

const ITEM_MAP = Object.fromEntries(GEAR.map((i) => [i.id, i]));

// Back-compat weapon views.
export const WEAPONS = GEAR.filter((i) => i.slot === 'weapon');
export const DEFAULT_WEAPON = ITEM_MAP['bronze_sword'];

// Starter loadout: the three tier-1 weapons + every tier-1 armour/accessory for
// all styles. Always owned so a fresh team has a full (weak) setup in each slot.
export const STARTER_WEAPON_IDS = ['bronze_sword', 'shortbow', 'novice_staff'];
export const STARTER_GEAR_IDS = [
  ...STARTER_WEAPON_IDS,
  ...Object.keys(TIER_NAMES).flatMap((style) =>
    Object.keys(GEAR_SLOTS).map((slot) => gearId(style, slot, 1))
  ),
];

/** Strict lookup: the item for an id, or null if unknown. */
export const itemById = (id) => ITEM_MAP[id] ?? null;

/** Weapon lookup, falling back to the default weapon (combat never wants null). */
export const weaponById = (id) => {
  const it = ITEM_MAP[id];
  return it && it.slot === 'weapon' ? it : DEFAULT_WEAPON;
};

/** The weapon of a given style + tier (used to build boss drop tables). */
export const weaponOf = (style, tier) =>
  WEAPONS.find((w) => w.style === style && w.tier === tier) ?? null;

const tierOf = (it) => it?.tier ?? 0;

/**
 * The single strongest owned weapon, optionally restricted to a style. Ties keep
 * the earlier WEAPONS entry (starter over later same-tier drops).
 */
export function bestOwnedWeapon(ownedIds, style = null) {
  const pool = ownedIds
    .map(weaponById)
    .filter((w) => (style ? w.style === style : true));
  if (pool.length === 0) return DEFAULT_WEAPON;
  return pool.reduce((best, w) => (tierOf(w) > tierOf(best) ? w : best));
}

/** The best owned piece for one (style, slot), or null if none owned. */
export function bestOwnedBySlot(ownedIds, style, slot) {
  const pool = ownedIds
    .map(itemById)
    .filter((it) => it && it.slot === slot && it.style === style);
  if (pool.length === 0) return null;
  return pool.reduce((best, it) => (tierOf(it) > tierOf(best) ? it : best));
}

/**
 * The full auto-equipped setup for a style: the best owned piece in each of the
 * six slots. The weapon slot always resolves to at least the default weapon.
 */
export function buildSetup(ownedIds, style) {
  const setup = {};
  for (const slot of SLOTS) setup[slot] = bestOwnedBySlot(ownedIds, style, slot);
  if (!setup.weapon) setup.weapon = DEFAULT_WEAPON;
  return setup;
}

/** Aggregate combat bonuses from a setup: { power, defence, accuracy }. */
export function setupStats(setup) {
  let power = 0;
  let defence = 0;
  let accuracy = 0;
  for (const slot of SLOTS) {
    const it = setup?.[slot];
    if (!it) continue;
    power += it.power ?? 0;
    defence += it.defence ?? 0;
    accuracy += it.accuracy ?? 0;
  }
  return { power, defence, accuracy };
}

/** The best owned weapon for each style the player has gear for. */
export function bestOwnedByStyle(ownedIds) {
  const byStyle = {};
  for (const w of ownedIds.map(weaponById)) {
    if (!byStyle[w.style] || tierOf(w) > tierOf(byStyle[w.style])) byStyle[w.style] = w;
  }
  return byStyle;
}
