// Per-team boss-ladder progress: load/save how far a team has unlocked up the
// ladder (table team_progress, keyed by season_id + team_name). Bosses unlock in
// order — beat rung i to fight rung i+1 — and `maxBossIndex` is the highest
// UNLOCKED ladder index (0 = only the Goblin). Mirrors gear.js / battle.js:
// every call degrades gracefully (Supabase unconfigured, table absent, or
// network error -> null / no-op) and the app keeps its in-session progress.

import { isSupabaseConfigured, sbSelect, sbUpsert } from './supabase.js';

/**
 * Load one team's unlocked-ladder index. Returns an integer >= 0, or null when
 * unconfigured / absent / on error (caller defaults to 0 = Goblin only).
 */
export async function loadProgress(seasonId, teamName) {
  if (!isSupabaseConfigured) return null;
  try {
    const rows = await sbSelect(
      `team_progress?season_id=eq.${seasonId}` +
        `&team_name=eq.${encodeURIComponent(teamName)}` +
        `&select=max_boss_index`
    );
    const row = rows?.[0];
    if (!row) return null;
    const n = Number(row.max_boss_index);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  } catch (err) {
    console.warn(`[progress] load failed for ${teamName}:`, err.message);
    return null;
  }
}

/** Persist one team's unlocked-ladder index (fire-and-forget upsert). */
export async function saveProgress(seasonId, teamName, maxBossIndex) {
  if (!isSupabaseConfigured) return;
  try {
    await sbUpsert(
      'team_progress',
      {
        season_id: seasonId,
        team_name: teamName,
        max_boss_index: maxBossIndex,
        updated_at: new Date().toISOString(),
      },
      'season_id,team_name'
    );
  } catch (err) {
    console.warn(`[progress] save failed for ${teamName}:`, err.message);
  }
}
