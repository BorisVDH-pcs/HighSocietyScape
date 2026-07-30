// Weapons decide which combat style an Attack uses, and carry a `power` bonus
// added to max hit. Each weapon also has a `tier`: the game always auto-equips
// the highest-tier weapon you own (see bestOwnedWeapon), so obtaining a Steel
// Sword (tier 2) automatically replaces the Bronze Sword (tier 1) — you never
// have to manually swap up to a stronger weapon. This is the gear system:
// starter weapons are always owned; others drop from bosses (see each boss's
// drop table in combat.js) and are added to the player's inventory. Icons are
// plain emoji (original 2D only — no ripped Jagex art).

export const WEAPONS = [
  {
    id: 'bronze_sword',
    name: 'Bronze Sword',
    style: 'melee',
    icon: '🗡️',
    power: 0,
    tier: 1,
    desc: 'A starter blade. Attacks scale with Attack & Strength.',
  },
  {
    id: 'shortbow',
    name: 'Shortbow',
    style: 'ranged',
    icon: '🏹',
    power: 0,
    tier: 1,
    desc: 'Quick and reliable. Attacks scale with Ranged.',
  },
  {
    id: 'novice_staff',
    name: 'Novice Staff',
    style: 'magic',
    icon: '🪄',
    power: 0,
    tier: 1,
    desc: 'Crackling with power. Attacks scale with Magic.',
  },
  {
    id: 'steel_sword',
    name: 'Steel Sword',
    style: 'melee',
    icon: '⚔️',
    power: 5,
    tier: 2,
    desc: 'A heavier blade looted from goblins. Hits harder than bronze.',
  },
];

// Weapons the player owns from the start; the rest must be earned as drops.
export const STARTER_WEAPON_IDS = ['bronze_sword', 'shortbow', 'novice_staff'];

export const DEFAULT_WEAPON = WEAPONS[0];

export const weaponById = (id) => WEAPONS.find((w) => w.id === id) ?? DEFAULT_WEAPON;

const tierOf = (w) => w?.tier ?? 0;

/**
 * The single strongest weapon among a set of owned ids — the one the game
 * auto-equips. Optionally restrict to a combat style (used by the GEAR menu so
 * picking "Melee" always equips your best melee weapon). Ties keep the earlier
 * weapon in WEAPONS order (i.e. starter over later same-tier drops).
 */
export function bestOwnedWeapon(ownedIds, style = null) {
  const pool = ownedIds
    .map(weaponById)
    .filter((w) => (style ? w.style === style : true));
  if (pool.length === 0) return DEFAULT_WEAPON;
  return pool.reduce((best, w) => (tierOf(w) > tierOf(best) ? w : best));
}

/** The best owned weapon for each style the player has gear for. */
export function bestOwnedByStyle(ownedIds) {
  const byStyle = {};
  for (const w of ownedIds.map(weaponById)) {
    if (!byStyle[w.style] || tierOf(w) > tierOf(byStyle[w.style])) byStyle[w.style] = w;
  }
  return byStyle;
}
