// Per-team gear persistence: load/save a team's owned weapons + equipped
// weapon to Supabase (table team_gear, keyed by season_id + team_name). Every
// call degrades gracefully — if Supabase isn't configured, or the table isn't
// there yet (migration 0002 not applied), or the network fails, these resolve
// to null / no-op and the app keeps its in-session gear.

import { isSupabaseConfigured, sbSelect, sbUpsert } from './supabase.js';
import { STARTER_GEAR_IDS, DEFAULT_WEAPON, itemById } from './weapons.js';

// Strict "is this id a real item?" check (weapon OR armour/accessory).
const isKnownItem = (id) => itemById(id) !== null;

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

    // Drop any ids the client no longer knows about, dedupe, always keep the
    // starter set so every slot has at least a tier-1 piece.
    const known = (row.owned_ids ?? []).filter(isKnownItem);
    const ownedIds = [...new Set([...STARTER_GEAR_IDS, ...known])];

    // Equipped must be a known, owned weapon; otherwise fall back to default.
    const eq = row.equipped_weapon_id;
    const weaponId =
      eq && itemById(eq)?.slot === 'weapon' && ownedIds.includes(eq) ? eq : DEFAULT_WEAPON.id;

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
