#!/usr/bin/env node
// Preview a team's derived character.
//
// Usage:
//   node scripts/showCharacter.mjs [competitionId] [--team "Team 1"] [--source db|snapshot]
//   node --env-file=.env scripts/showCharacter.mjs --team "Team 1"            (DB)
//   node scripts/showCharacter.mjs --team "Team 1" --source snapshot          (local file)
//
// Default source: db if SUPABASE_URL+SUPABASE_ANON_KEY are set, else snapshot.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCharacter, fetchCharacter } from '../lib/character.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

function parseArgs(argv) {
  const a = { comp: null, team: 'Team 1', source: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--team') a.team = argv[++i];
    else if (argv[i] === '--source') a.source = argv[++i];
    else if (!a.comp) a.comp = argv[i];
  }
  return a;
}

function fromSnapshot(compId, teamName) {
  const path = join(REPO_ROOT, 'data', `${compId}-latest.json`);
  const snap = JSON.parse(readFileSync(path, 'utf8'));
  const t = snap.teams[teamName];
  if (!t) throw new Error(`Team "${teamName}" not in snapshot. Have: ${Object.keys(snap.teams).join(', ')}`);
  const skillXp = Object.fromEntries(Object.entries(t.skills).map(([k, v]) => [k, v.xp]));
  return buildCharacter(skillXp, t.bosses ?? {}, { team: teamName, seasonId: snap.competitionId });
}

function printCharacter(c) {
  console.log(`\n=== ${c.team}  (season ${c.seasonId}) ===`);
  console.log(`Combat level: ${c.combatLevel}   Total level: ${c.totalLevel}   Maxed: ${c.maxedSkills.length}/24`);
  console.log('\nSkill         Lvl   Pooled XP        Overflow');
  console.log('-----         ---   ---------        --------');
  for (const [name, s] of Object.entries(c.skills).sort((a, b) => b[1].xp - a[1].xp)) {
    const flag = s.maxed ? ' *' : '';
    console.log(
      `${name.padEnd(13)} ${String(s.level).padStart(3)}   ${String(s.xp).padStart(12)}   ${String(s.overflowXp).padStart(10)}${flag}`
    );
  }
  const bosses = Object.entries(c.bosses);
  if (bosses.length) {
    console.log(`\nTop bosses by KC:`);
    for (const [b, kc] of bosses.slice(0, 8)) console.log(`  ${b.padEnd(24)} ${kc}`);
    if (bosses.length > 8) console.log(`  ...and ${bosses.length - 8} more`);
  }
}

async function main() {
  const { comp, team, source } = parseArgs(process.argv.slice(2));
  const compId = comp || process.env.WOM_COMPETITION_ID || '145906';
  const useDb = source ? source === 'db' : Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

  const c = useDb ? await fetchCharacter(compId, team) : fromSnapshot(compId, team);
  console.log(`(source: ${useDb ? 'Supabase DB' : 'local snapshot'})`);
  printCharacter(c);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
