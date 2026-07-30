// Pure, browser-safe xp / level / character logic. NO node builtins, NO fs —
// so this module is shared verbatim by the Node scripts AND the web frontend.
// Callers pass in the parsed xp_table.json (the single source of truth for the
// curve — see xp_table.json). Never re-derive the xp curve by hand elsewhere.

/** Turn parsed xp_table.json into the internal table shape (sorted rows). */
export function normalizeTable(json) {
  const rows = Object.entries(json.levels)
    .map(([lvl, xp]) => ({ level: Number(lvl), xp: Number(xp) }))
    .sort((a, b) => a.level - b.level);
  return {
    rows,
    skills: json.skills,
    maxLevel: 99,
    xpAt99: Number(json.levels['99']),
  };
}

/**
 * Raw virtual level for an xp amount (uncapped — can exceed 99 if the table
 * has headroom rows). Returns 1 for 0 xp.
 */
export function levelForXp(table, xp) {
  let level = 1;
  for (const row of table.rows) {
    if (xp >= row.xp) level = row.level;
    else break;
  }
  return level;
}

/**
 * Convert a pooled xp amount into the app's display shape.
 * Policy (CONFIRMED, see CLAUDE.md): sum member gains, cap the level at 99, and
 * DISCARD overflow xp — surplus past 99 grants NO combat/damage bonus. The
 * `overflowXp` field is informational/display only and must not feed a mechanic.
 */
export function deriveSkillLevel(table, pooledXp) {
  const rawLevel = levelForXp(table, pooledXp);
  const level = Math.min(table.maxLevel, rawLevel);
  const maxed = pooledXp >= table.xpAt99;
  const overflowXp = maxed ? pooledXp - table.xpAt99 : 0;
  return { xp: pooledXp, level, maxed, overflowXp };
}

// OSRS combat level — canonical Jagex formula, from derived (capped-99) levels.
export function combatLevel(levels) {
  const g = (k) => levels[k] ?? 1;
  const base = 0.25 * (g('defence') + g('hitpoints') + Math.floor(g('prayer') / 2));
  const melee = 0.325 * (g('attack') + g('strength'));
  const range = 0.325 * Math.floor((g('ranged') * 3) / 2);
  const mage = 0.325 * Math.floor((g('magic') * 3) / 2);
  return Math.floor(base + Math.max(melee, range, mage));
}

/**
 * Build a character view model from pooled maps.
 * @param {object} table    normalized xp table (from normalizeTable)
 * @param {Record<string, number>} skillXp   skill -> pooled xp
 * @param {Record<string, number>} bossKc     boss  -> pooled kill count
 */
export function buildCharacter(table, skillXp = {}, bossKc = {}, meta = {}) {
  const known = table.skills;
  const skills = {};
  const levels = {};
  // Cover every known skill (default 0), then any extra the source returned.
  const names = new Set([...known.filter((s) => s !== 'overall'), ...Object.keys(skillXp)]);
  for (const name of names) {
    if (name === 'overall') continue;
    const derived = deriveSkillLevel(table, skillXp[name] ?? 0);
    skills[name] = derived;
    levels[name] = derived.level;
  }

  const maxedSkills = Object.entries(skills)
    .filter(([, s]) => s.maxed)
    .map(([name]) => name);

  const bosses = Object.fromEntries(
    Object.entries(bossKc).sort((a, b) => b[1] - a[1])
  );

  return {
    ...meta, // e.g. { team, seasonId }
    combatLevel: combatLevel(levels),
    totalLevel: Object.values(levels).reduce((a, b) => a + b, 0),
    totalXp: Object.values(skillXp).reduce((a, b) => a + (b || 0), 0) -
      (skillXp.overall ?? 0),
    maxedSkills,
    skills, // { skill: { xp, level, maxed, overflowXp } }
    bosses, // { boss: kc }
  };
}
