// Cross-team leaderboard: rank every team in the season against each other.
//
// Combat/total levels come from the bundled SNAPSHOT (instant, offline-safe, so
// the board always renders), overlaid with LIVE progress + kills read from
// Supabase in two batched queries (all teams at once — team_progress and
// team_kills are keyed by season_id + team_name, so one select each covers the
// whole season). If Supabase is unconfigured or a read fails, progress/kills
// fall back to 0 and the board still shows level standings.
//
// Ranking: furthest boss reached, then total kills, then combat level, then
// total level. "Furthest" = the highest ladder index the team has UNLOCKED
// (its frontier boss), from team_progress.max_boss_index.

import { TEAMS, SEASON, loadTeamCharacter } from './character.js';
import { BOSS_LADDER } from './combat.js';
import { isSupabaseConfigured, sbSelect } from './supabase.js';

/** Sum a team_kills jsonb map ({ bossId: count }) into a single total. */
function sumKills(map) {
  if (!map || typeof map !== 'object') return 0;
  let total = 0;
  for (const v of Object.values(map)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) total += n;
  }
  return total;
}

/**
 * Build the ranked leaderboard rows for the current season. Always resolves
 * (never rejects) — live data is best-effort on top of the snapshot baseline.
 * Each row: { rank, team, combatLevel, totalLevel, maxed, furthestIndex,
 * furthestBoss, kills }.
 */
export async function loadLeaderboard() {
  // Snapshot baseline for every team — synchronous, always available.
  const rows = TEAMS.map((name) => {
    const c = loadTeamCharacter(name);
    return {
      team: name,
      combatLevel: c.combatLevel,
      totalLevel: c.totalLevel,
      maxed: c.maxedSkills.length,
      furthestIndex: 0,
      kills: 0,
    };
  });
  const byName = Object.fromEntries(rows.map((r) => [r.team, r]));

  // Overlay live progress + kills (best-effort, one batched query each).
  if (isSupabaseConfigured) {
    try {
      const [prog, kills] = await Promise.all([
        sbSelect(`team_progress?season_id=eq.${SEASON.id}&select=team_name,max_boss_index`),
        sbSelect(`team_kills?season_id=eq.${SEASON.id}&select=team_name,kills`),
      ]);
      for (const r of prog ?? []) {
        const row = byName[r.team_name];
        if (row) row.furthestIndex = Math.max(0, Math.floor(Number(r.max_boss_index) || 0));
      }
      for (const r of kills ?? []) {
        const row = byName[r.team_name];
        if (row) row.kills = sumKills(r.kills);
      }
    } catch (err) {
      console.warn('[leaderboard] live load failed:', err.message);
    }
  }

  const last = BOSS_LADDER.length - 1;
  for (const r of rows) {
    r.furthestIndex = Math.min(last, r.furthestIndex);
    r.furthestBoss = BOSS_LADDER[r.furthestIndex]?.name ?? BOSS_LADDER[0].name;
  }

  rows.sort(
    (a, b) =>
      b.furthestIndex - a.furthestIndex ||
      b.kills - a.kills ||
      b.combatLevel - a.combatLevel ||
      b.totalLevel - a.totalLevel ||
      a.team.localeCompare(b.team)
  );

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
