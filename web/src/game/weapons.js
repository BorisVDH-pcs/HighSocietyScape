// Weapons decide which combat style an Attack uses, and carry a `power` bonus
// added to max hit. This is the gear system: starter weapons are always owned;
// others drop from bosses (see each boss's drop table in combat.js) and are
// added to the player's inventory. Icons are plain emoji (original 2D only —
// no ripped Jagex art).

export const WEAPONS = [
  {
    id: 'bronze_sword',
    name: 'Bronze Sword',
    style: 'melee',
    icon: '🗡️',
    power: 0,
    desc: 'A starter blade. Attacks scale with Attack & Strength.',
  },
  {
    id: 'shortbow',
    name: 'Shortbow',
    style: 'ranged',
    icon: '🏹',
    power: 0,
    desc: 'Quick and reliable. Attacks scale with Ranged.',
  },
  {
    id: 'novice_staff',
    name: 'Novice Staff',
    style: 'magic',
    icon: '🪄',
    power: 0,
    desc: 'Crackling with power. Attacks scale with Magic.',
  },
  {
    id: 'steel_sword',
    name: 'Steel Sword',
    style: 'melee',
    icon: '⚔️',
    power: 5,
    desc: 'A heavier blade looted from goblins. Hits harder than bronze.',
  },
];

// Weapons the player owns from the start; the rest must be earned as drops.
export const STARTER_WEAPON_IDS = ['bronze_sword', 'shortbow', 'novice_staff'];

export const DEFAULT_WEAPON = WEAPONS[0];

export const weaponById = (id) => WEAPONS.find((w) => w.id === id) ?? DEFAULT_WEAPON;
