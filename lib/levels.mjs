// Node-side wrapper around the pure logic in ./core.mjs. Loads the xp table
// from ../xp_table.json (the single source of truth) via fs and caches it, then
// delegates to core. The browser imports ./core.mjs directly with its own JSON.
// Public API here is unchanged — scripts and lib/character.mjs still import
// loadXpTable / levelForXp / deriveSkillLevel from this file.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  normalizeTable,
  levelForXp as coreLevelForXp,
  deriveSkillLevel as coreDeriveSkillLevel,
} from './core.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Load and cache the normalized xp table (rows + skills list). */
let _table = null;
export function loadXpTable() {
  if (_table) return _table;
  const raw = readFileSync(join(__dirname, '..', 'xp_table.json'), 'utf8');
  _table = normalizeTable(JSON.parse(raw));
  return _table;
}

export function levelForXp(xp) {
  return coreLevelForXp(loadXpTable(), xp);
}

export function deriveSkillLevel(pooledXp) {
  return coreDeriveSkillLevel(loadXpTable(), pooledXp);
}
