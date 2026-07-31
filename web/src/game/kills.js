// Per-team boss kill counts: load/save how many times a team has killed each
// boss (table team_kills, keyed by season_id + team_name). Stored as a single
// jsonb map { <bossId>: <count> } per team. Mirrors gear.js / battle.js /
// progress.js: every call degrades gracefully (Supabase unconfigured, table
// absent, or network error -> null / no-op) and the app keeps its in-session
// counts.

import { isSupabaseConfigured, sbSelect, sbUpsert } from './supabase.js';

/** Coerce a raw jsonb value into a clean { bossId: positiveInt } map. */
function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [bossId, v] of Object.entries(raw)) {
    const n = Math.floor(Number(v));
    if (Number.isFinite(n) && n > 0) out[bossId] = n;
  }
  return out;
}

/**
 * Load one team's boss kill counts as a { bossId: count } map. Returns null when
 * unconfigured / absent / on error (caller defaults to an empty map).
 */
export async function loadKills(seasonId, teamName) {
  if (!isSupabaseConfigured) return null;
  try {
    const rows = await sbSelect(
      `team_kills?season_id=eq.${seasonId}` +
        `&team_name=eq.${encodeURIComponent(teamName)}` +
        `&select=kills`
    );
    const row = rows?.[0];
    if (!row) return null;
    return sanitize(row.kills);
  } catch (err) {
    console.warn(`[kills] load failed for ${teamName}:`, err.message);
    return null;
  }
}

/**
 * Persist one team's whole kill-count map (fire-and-forget upsert). The caller
 * increments in React state and passes the full next map, matching the
 * last-write-wins blob model used by gear/battle.
 */
export async function saveKills(seasonId, teamName, kills) {
  if (!isSupabaseConfigured) return;
  try {
    await sbUpsert(
      'team_kills',
      {
        season_id: seasonId,
        team_name: teamName,
        kills,
        updated_at: new Date().toISOString(),
      },
      'season_id,team_name'
    );
  } catch (err) {
    console.warn(`[kills] save failed for ${teamName}:`, err.message);
  }
}
