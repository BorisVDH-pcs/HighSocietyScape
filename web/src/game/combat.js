// Turn-based combat engine. Pure-ish: each call returns a NEW battle state so
// React can render from it. Stats derive from the team's virtual levels (no
// gear yet — gear/drop tables come later). Overflow xp grants no bonus, per the
// confirmed pooling policy.

// First boss on the ladder: the Goblin. Deliberately easy — this validates the
// loop; harder bosses will scale hp/accuracy/maxHit up from here.
export const GOBLIN = {
  id: 'goblin',
  name: 'Goblin',
  maxHp: 55,
  maxHit: 4,      // damage it can roll against the player
  accuracy: 0.45, // chance one of its swings lands
  blurb: 'A snivelling green nuisance. Every hero starts somewhere.',
};

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

export function initBattle(character, boss = GOBLIN) {
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
    },
    log: [
      {
        t: 'info',
        text: `A ${boss.name} blocks the path. ${character.team} (combat ${character.combatLevel}) readies for battle.`,
      },
    ],
  };
}

const rollDamage = (maxHit) => Math.floor(Math.random() * (maxHit + 1));
const lands = (accuracy) => Math.random() < accuracy;

/**
 * Advance one full round: the player attacks with the chosen style, then — if
 * still standing — the boss retaliates. Returns a new state.
 */
export function attack(state, styleKey) {
  if (state.status !== 'active') return state;

  const s = structuredClone(state);
  const style = s.player.styles[styleKey];
  const noun = style.label.toLowerCase();
  s.round += 1;
  const entries = [];

  // --- Player turn ---
  if (lands(style.accuracy)) {
    const dmg = rollDamage(style.maxHit);
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
