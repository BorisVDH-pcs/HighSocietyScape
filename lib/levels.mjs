// Pure xp <-> level helpers. Single source of truth for the curve is
// ../xp_table.json (see CLAUDE.md). Import this everywhere; never re-derive
// levels by hand.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Load and cache the xp table (levels map + skills list). */
let _table = null;
export function loadXpTable() {
  if (_table) return _table;
  const raw = readFileSync(join(__dirname, '..', 'xp_table.json'), 'utf8');
  const json = JSON.parse(raw);
  // Sorted [ {level, xp}, ... ] ascending by level.
  const rows = Object.entries(json.levels)
    .map(([lvl, xp]) => ({ level: Number(lvl), xp: Number(xp) }))
    .sort((a, b) => a.level - b.level);
  _table = {
    rows,
    skills: json.skills,
    maxLevel: 99,
    xpAt99: json.levels['99'],
  };
  return _table;
}

/**
 * Raw virtual level for an xp amount (uncapped — can exceed 99 if the table
 * has headroom rows). Returns 1 for 0 xp.
 */
export function levelForXp(xp) {
  const { rows } = loadXpTable();
  let level = 1;
  for (const row of rows) {
    if (xp >= row.xp) level = row.level;
    else break;
  }
  return level;
}

/**
 * Convert a pooled xp amount into the app's display shape.
 * Policy (see CLAUDE.md "Open questions"): cap the shown level at 99 and
 * expose overflow xp separately so the battle system can turn surplus into a
 * bonus. Change ONLY here if the pooling policy changes.
 */
export function deriveSkillLevel(pooledXp) {
  const { xpAt99, maxLevel } = loadXpTable();
  const rawLevel = levelForXp(pooledXp);
  const level = Math.min(maxLevel, rawLevel);
  const maxed = pooledXp >= xpAt99;
  const overflowXp = maxed ? pooledXp - xpAt99 : 0;
  return { xp: pooledXp, level, maxed, overflowXp };
}
