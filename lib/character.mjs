// Read layer: turn a team's pooled WOM data into the "character" a frontend
// renders. Pure builders work on plain pooled maps (usable with the DB, the
// cached snapshot, or live fetch output). DB readers use the ANON key — this
// is the safe, frontend-facing path (writes live in scripts/syncToSupabase).

import { deriveSkillLevel, loadXpTable } from './levels.mjs';

// --- OSRS combat level -------------------------------------------------------
// Canonical Jagex formula, computed from derived (capped-99) combat levels.
export function combatLevel(levels) {
  const g = (k) => levels[k] ?? 1;
  const base = 0.25 * (g('defence') + g('hitpoints') + Math.floor(g('prayer') / 2));
  const melee = 0.325 * (g('attack') + g('strength'));
  const range = 0.325 * Math.floor((g('ranged') * 3) / 2);
  const mage = 0.325 * Math.floor((g('magic') * 3) / 2);
  return Math.floor(base + Math.max(melee, range, mage));
}

/**
 * Build a character from pooled maps.
 * @param {Record<string, number>} skillXp   skill -> pooled xp
 * @param {Record<string, number>} bossKc     boss  -> pooled kill count
 * @returns character view model
 */
export function buildCharacter(skillXp = {}, bossKc = {}, meta = {}) {
  const { skills: known } = loadXpTable();

  const skills = {};
  const levels = {};
  // Cover every known skill (default 0), then any extra the source returned.
  const names = new Set([...known.filter((s) => s !== 'overall'), ...Object.keys(skillXp)]);
  for (const name of names) {
    if (name === 'overall') continue;
    const derived = deriveSkillLevel(skillXp[name] ?? 0);
    skills[name] = derived;
    levels[name] = derived.level;
  }

  const maxedSkills = Object.entries(skills)
    .filter(([, s]) => s.maxed)
    .map(([name]) => name);

  // Bosses sorted by kc desc for display convenience.
  const bosses = Object.fromEntries(
    Object.entries(bossKc).sort((a, b) => b[1] - a[1])
  );

  return {
    ...meta, // e.g. { team, seasonId }
    combatLevel: combatLevel(levels),
    totalLevel: Object.values(levels).reduce((a, b) => a + b, 0),
    totalXp: Object.values(skillXp).reduce((a, b) => a + (b || 0), 0) -
      (skillXp.overall ?? 0), // don't double-count overall if present
    maxedSkills,
    skills, // { skill: { xp, level, maxed, overflowXp } }
    bosses, // { boss: kc }
  };
}

// --- Supabase (PostgREST) read helpers, ANON key -----------------------------
const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;

async function readGet(path) {
  if (!URL || !ANON) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY for DB reads.');
  }
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  if (!res.ok) throw new Error(`Supabase read ${path} -> HTTP ${res.status}`);
  return res.json();
}

/** All teams in a season, with their generated ids. */
export function fetchTeams(competitionId) {
  return readGet(`teams?season_id=eq.${competitionId}&select=id,name,member_count`);
}

/** One team's character, read live from the DB and derived. */
export async function fetchCharacter(competitionId, teamName) {
  const teams = await fetchTeams(competitionId);
  const team = teams.find((t) => t.name === teamName);
  if (!team) {
    throw new Error(`Team "${teamName}" not in season ${competitionId}. Have: ${teams.map((t) => t.name).join(', ')}`);
  }
  const [skillRows, bossRows] = await Promise.all([
    readGet(`team_skills?team_id=eq.${team.id}&select=skill,pooled_xp`),
    readGet(`team_bosses?team_id=eq.${team.id}&select=boss,pooled_kc`),
  ]);
  const skillXp = Object.fromEntries(skillRows.map((r) => [r.skill, Number(r.pooled_xp)]));
  const bossKc = Object.fromEntries(bossRows.map((r) => [r.boss, Number(r.pooled_kc)]));
  return buildCharacter(skillXp, bossKc, { team: team.name, seasonId: Number(competitionId) });
}
