// Per-team gear persistence: load/save a team's owned weapons + equipped
// weapon to Supabase (table team_gear, keyed by season_id + team_name). Every
// call degrades gracefully — if Supabase isn't configured, or the table isn't
// there yet (migration 0002 not applied), or the network fails, these resolve
// to null / no-op and the app keeps its in-session gear.

import { isSupabaseConfigured, sbSelect, sbUpsert } from './supabase.js';
import { STARTER_WEAPON_IDS, DEFAULT_WEAPON, weaponById } from './weapons.js';

// weaponById falls back to DEFAULT_WEAPON for unknown ids; this is the strict
// "is this id a real weapon?" check.
const isKnownWeapon = (id) => weaponById(id).id === id;

/**
 * Load one team's persisted gear. Returns { ownedIds, weaponId } or null when
 * unconfigured / absent / on error (caller keeps the default loadout).
 */
export async function loadGear(seasonId, teamName) {
  if (!isSupabaseConfigured) return null;
  try {
    const rows = await sbSelect(
      `team_gear?season_id=eq.${seasonId}` +
        `&team_name=eq.${encodeURIComponent(teamName)}` +
        `&select=owned_ids,equipped_weapon_id`
    );
    const row = rows?.[0];
    if (!row) return null;

    // Drop any ids the client no longer knows about, dedupe, keep starters.
    const owned = [...new Set((row.owned_ids ?? []).filter(isKnownWeapon))];
    const ownedIds = owned.length ? owned : STARTER_WEAPON_IDS;

    // Equipped must be a known, owned weapon; otherwise fall back to default.
    const eq = row.equipped_weapon_id;
    const weaponId = eq && isKnownWeapon(eq) && ownedIds.includes(eq) ? eq : DEFAULT_WEAPON.id;

    return { ownedIds, weaponId };
  } catch (err) {
    console.warn(`[gear] load failed for ${teamName}:`, err.message);
    return null;
  }
}

/** Persist one team's gear (fire-and-forget upsert). No-op when unconfigured. */
export async function saveGear(seasonId, teamName, gear) {
  if (!isSupabaseConfigured) return;
  try {
    await sbUpsert(
      'team_gear',
      {
        season_id: seasonId,
        team_name: teamName,
        owned_ids: gear.ownedIds,
        equipped_weapon_id: gear.weaponId,
        updated_at: new Date().toISOString(),
      },
      'season_id,team_name'
    );
  } catch (err) {
    console.warn(`[gear] save failed for ${teamName}:`, err.message);
  }
}
