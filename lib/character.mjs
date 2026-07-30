// Read layer: turn a team's pooled WOM data into the "character" a frontend
// renders. Pure builders work on plain pooled maps (usable with the DB, the
// cached snapshot, or live fetch output). DB readers use the ANON key — this
// is the safe, frontend-facing path (writes live in scripts/syncToSupabase).

import { loadXpTable } from './levels.mjs';
import { buildCharacter as coreBuildCharacter, combatLevel } from './core.mjs';

// Combat-level formula lives in ./core.mjs (shared with the frontend).
export { combatLevel };

/**
 * Build a character from pooled maps. Node-side wrapper that injects the
 * fs-loaded xp table into the pure core builder.
 * @param {Record<string, number>} skillXp   skill -> pooled xp
 * @param {Record<string, number>} bossKc     boss  -> pooled kill count
 * @returns character view model
 */
export function buildCharacter(skillXp = {}, bossKc = {}, meta = {}) {
  return coreBuildCharacter(loadXpTable(), skillXp, bossKc, meta);
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
