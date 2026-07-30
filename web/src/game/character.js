// Browser-side character loading. Imports the SAME shared logic and data the
// Node scripts use (single source of truth) — Vite bundles the JSON directly,
// no node:fs needed.
//
// Two paths:
//   loadTeamCharacter      — synchronous, from the bundled snapshot. Instant,
//                            offline, used as the seed + fallback.
//   loadTeamCharacterLive  — async, reads the live Supabase tables (team_skills
//                            / team_bosses) so stats reflect the team's CURRENT
//                            pooled WOM gains. Mirrors lib/character.mjs's
//                            fetchCharacter but with the browser anon client.
// App.jsx seeds from the snapshot, then replaces with the live read when it
// resolves; the live read degrades to null (keep the snapshot) when Supabase
// isn't configured or the request fails.

import xpTable from '../../../xp_table.json';
import snapshot from '../../../data/145906-latest.json';
import { normalizeTable, buildCharacter } from '../../../lib/core.mjs';
import { isSupabaseConfigured, sbSelect } from './supabase.js';

const table = normalizeTable(xpTable);

export const TEAMS = Object.keys(snapshot.teams);
export const SEASON = { id: snapshot.competitionId, title: snapshot.title };

/** Derive a team's shared character from the cached WOM snapshot. */
export function loadTeamCharacter(teamName = 'Team 1') {
  const t = snapshot.teams[teamName];
  if (!t) throw new Error(`Team "${teamName}" not in snapshot. Have: ${TEAMS.join(', ')}`);
  const skillXp = Object.fromEntries(
    Object.entries(t.skills).map(([k, v]) => [k, v.xp])
  );
  return buildCharacter(table, skillXp, t.bosses ?? {}, {
    team: teamName,
    seasonId: snapshot.competitionId,
  });
}

/**
 * Derive a team's shared character from the LIVE Supabase tables, so stats
 * reflect the team's current pooled WOM gains rather than the build-time
 * snapshot. Returns null when Supabase isn't configured, the team is absent, or
 * the read fails — the caller keeps the snapshot-derived character.
 */
export async function loadTeamCharacterLive(teamName = 'Team 1') {
  if (!isSupabaseConfigured) return null;
  try {
    const teams = await sbSelect(`teams?season_id=eq.${SEASON.id}&select=id,name`);
    const team = teams?.find((t) => t.name === teamName);
    if (!team) return null;
    const [skillRows, bossRows] = await Promise.all([
      sbSelect(`team_skills?team_id=eq.${team.id}&select=skill,pooled_xp`),
      sbSelect(`team_bosses?team_id=eq.${team.id}&select=boss,pooled_kc`),
    ]);
    const skillXp = Object.fromEntries((skillRows ?? []).map((r) => [r.skill, Number(r.pooled_xp)]));
    const bossKc = Object.fromEntries((bossRows ?? []).map((r) => [r.boss, Number(r.pooled_kc)]));
    return buildCharacter(table, skillXp, bossKc, { team: teamName, seasonId: SEASON.id });
  } catch (err) {
    console.warn(`[character] live load failed for ${teamName}:`, err.message);
    return null;
  }
}
