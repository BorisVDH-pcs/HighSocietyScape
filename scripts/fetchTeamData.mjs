#!/usr/bin/env node
// Fetch a WOM competition and turn every team into its shared-character
// snapshot: pooled xp + derived level per skill, and pooled boss KC.
//
// Usage:
//   node scripts/fetchTeamData.mjs [competitionId] [--team "Team 1"]
//   WOM_COMPETITION_ID=145906 node scripts/fetchTeamData.mjs
//
// Writes: data/<competitionId>-latest.json  (overwritten each run)
// This is the core-loop data producer; the app/DB reads its output shape.

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getCompetition, getPlayerGains, groupByTeam } from '../lib/wom.mjs';
import { deriveSkillLevel, loadXpTable } from '../lib/levels.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const DEFAULT_COMP = '145906'; // High Society Snakes and Rats Bingo

function parseArgs(argv) {
  const args = { comp: null, team: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--team') args.team = argv[++i];
    else if (!args.comp) args.comp = argv[i];
  }
  return args;
}

// Be polite to the API: small delay between player requests.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function poolTeam(members, startDate, endDate) {
  const skills = {}; // name -> total gained xp
  const bosses = {}; // name -> total gained kc
  const missing = [];
  for (const p of members) {
    const username = p.player?.username ?? p.player?.displayName;
    try {
      const g = await getPlayerGains(username, startDate, endDate);
      for (const [k, v] of Object.entries(g.skills)) skills[k] = (skills[k] ?? 0) + v;
      for (const [k, v] of Object.entries(g.bosses)) bosses[k] = (bosses[k] ?? 0) + v;
    } catch (err) {
      missing.push({ username, error: String(err.message ?? err) });
    }
    await sleep(250);
  }
  return { skills, bosses, missing };
}

function buildCharacter(pool) {
  const { skills } = loadXpTable();
  const derived = {};
  // Ensure every known skill is present even if the team gained 0 there.
  for (const name of skills) {
    if (name === 'overall') continue;
    derived[name] = deriveSkillLevel(pool.skills[name] ?? 0);
  }
  // Include any skill WOM returned that the table doesn't know about yet.
  for (const [name, xp] of Object.entries(pool.skills)) {
    if (name === 'overall' || derived[name]) continue;
    derived[name] = deriveSkillLevel(xp);
  }
  return derived;
}

async function main() {
  const { comp, team } = parseArgs(process.argv.slice(2));
  const competitionId = comp || process.env.WOM_COMPETITION_ID || DEFAULT_COMP;

  const competition = await getCompetition(competitionId);
  const startDate = competition.startsAt;
  const endDate = new Date().toISOString();
  const teams = groupByTeam(competition);

  const wanted = team ? { [team]: teams[team] } : teams;
  if (team && !teams[team]) {
    throw new Error(`Team "${team}" not found. Teams: ${Object.keys(teams).join(', ')}`);
  }

  const out = {
    competitionId: Number(competitionId),
    title: competition.title,
    window: { start: startDate, end: endDate },
    generatedAt: endDate,
    teams: {},
  };

  for (const [teamName, members] of Object.entries(wanted)) {
    if (!members) continue;
    process.stderr.write(`Pooling ${teamName} (${members.length} members)...\n`);
    const pool = await poolTeam(members, startDate, endDate);
    const character = buildCharacter(pool);
    out.teams[teamName] = {
      memberCount: members.length,
      members: members.map((m) => m.player?.displayName),
      skills: character,   // { skill: { xp, level, maxed, overflowXp } }
      bosses: pool.bosses, // { boss: pooledKc }
      missing: pool.missing,
    };
  }

  const dataDir = join(REPO_ROOT, 'data');
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, `${competitionId}-latest.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));

  // Human-readable summary to stdout.
  for (const [teamName, t] of Object.entries(out.teams)) {
    const maxed = Object.values(t.skills).filter((s) => s.maxed).length;
    const top = Object.entries(t.skills)
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 5)
      .map(([n, s]) => `${n} ${s.level}`)
      .join(', ');
    console.log(`\n${teamName}: ${maxed} skill(s) maxed. Top: ${top}`);
    if (t.missing.length) console.log(`  no data for: ${t.missing.map((m) => m.username).join(', ')}`);
  }
  console.log(`\nWrote ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
