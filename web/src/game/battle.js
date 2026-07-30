// Per-team battle-state persistence: save/restore an in-progress fight to
// Supabase (table team_battle, keyed by season_id + team_name) so closing the
// app mid-battle and returning resumes the SAME fight — enemy HP, hero HP,
// round and combat log intact. Mirrors gear.js: every call degrades gracefully
// (Supabase unconfigured, table absent, or network error -> null / no-op) and
// the app falls back to a fresh battle.
//
// We persist only the VOLATILE bits (round, status, boss id + hp, player hp,
// equipped weapon id, log). Everything else — boss stats, sprites, combat
// styles — is rebuilt from code + the live character by rehydrateBattle
// (combat.js), so a later balance or art change is never frozen into a stale
// saved blob.

import { isSupabaseConfigured, sbSelect, sbUpsert } from './supabase.js';

/** Reduce a full battle object to the volatile columns stored in team_battle. */
export function serializeBattle(battle) {
  return {
    round: battle.round ?? 0,
    status: battle.status ?? 'active',
    boss_id: battle.boss.id,
    boss_hp: battle.boss.hp,
    player_hp: battle.player.hp,
    weapon_id: battle.player.weapon?.id ?? null,
    log: Array.isArray(battle.log) ? battle.log : [],
  };
}

/**
 * Load one team's saved battle. Returns the volatile snapshot (see below) or
 * null when unconfigured / absent / on error (caller starts a fresh fight).
 * The caller passes this to rehydrateBattle to rebuild a playable battle.
 */
export async function loadBattle(seasonId, teamName) {
  if (!isSupabaseConfigured) return null;
  try {
    const rows = await sbSelect(
      `team_battle?season_id=eq.${seasonId}` +
        `&team_name=eq.${encodeURIComponent(teamName)}` +
        `&select=round,status,boss_id,boss_hp,player_hp,weapon_id,log`
    );
    const row = rows?.[0];
    if (!row) return null;
    return {
      round: row.round ?? 0,
      status: row.status ?? 'active',
      bossId: row.boss_id,
      bossHp: row.boss_hp,
      playerHp: row.player_hp,
      weaponId: row.weapon_id,
      log: Array.isArray(row.log) ? row.log : [],
    };
  } catch (err) {
    console.warn(`[battle] load failed for ${teamName}:`, err.message);
    return null;
  }
}

/** Persist one team's battle (fire-and-forget upsert). No-op when unconfigured. */
export async function saveBattle(seasonId, teamName, battle) {
  if (!isSupabaseConfigured) return;
  try {
    await sbUpsert(
      'team_battle',
      {
        season_id: seasonId,
        team_name: teamName,
        ...serializeBattle(battle),
        updated_at: new Date().toISOString(),
      },
      'season_id,team_name'
    );
  } catch (err) {
    console.warn(`[battle] save failed for ${teamName}:`, err.message);
  }
}
