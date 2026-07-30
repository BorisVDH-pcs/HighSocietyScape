// Browser-side character loading. Imports the SAME shared logic and data the
// Node scripts use (single source of truth) — Vite bundles the JSON directly,
// no node:fs needed. For now we derive from the committed snapshot; swapping to
// a live Supabase read later is a one-function change (see loadTeamCharacter).

import xpTable from '../../../xp_table.json';
import snapshot from '../../../data/145906-latest.json';
import { normalizeTable, buildCharacter } from '../../../lib/core.mjs';

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
