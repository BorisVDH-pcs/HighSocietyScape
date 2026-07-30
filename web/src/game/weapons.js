// Weapons decide which combat style an Attack uses. This is the seed of the
// gear system — later, weapons drop from bosses (rolled off real KC) and carry
// stat bonuses. For now each just selects a style; accuracy/max-hit still come
// from the matching skill level in combat.js. Icons are plain emoji (original
// 2D only — no ripped Jagex art).

export const WEAPONS = [
  {
    id: 'bronze_sword',
    name: 'Bronze Sword',
    style: 'melee',
    icon: '🗡️',
    desc: 'A starter blade. Attacks scale with Attack & Strength.',
  },
  {
    id: 'shortbow',
    name: 'Shortbow',
    style: 'ranged',
    icon: '🏹',
    desc: 'Quick and reliable. Attacks scale with Ranged.',
  },
  {
    id: 'novice_staff',
    name: 'Novice Staff',
    style: 'magic',
    icon: '🪄',
    desc: 'Crackling with power. Attacks scale with Magic.',
  },
];

export const DEFAULT_WEAPON = WEAPONS[0];

export const weaponById = (id) => WEAPONS.find((w) => w.id === id) ?? DEFAULT_WEAPON;
