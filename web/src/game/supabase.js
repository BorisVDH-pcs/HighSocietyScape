// Dependency-free browser Supabase (PostgREST) client using the public ANON
// key — mirrors lib/supabase.mjs but for the frontend. Reads AND the app-side
// gear writes go through this key; RLS gates what it can touch (read-only WOM
// tables, read/write team_gear). Config comes from Vite env vars:
//
//   web/.env :  VITE_SUPABASE_URL=...   VITE_SUPABASE_ANON_KEY=...
//
// When those are absent the app runs fully offline against the bundled
// snapshot (see isSupabaseConfigured) — gear then lives in session state only.

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True only when both env vars are present, so callers can fall back cleanly. */
export const isSupabaseConfigured = Boolean(URL && ANON);

function headers(extra = {}) {
  return { apikey: ANON, Authorization: `Bearer ${ANON}`, ...extra };
}

/** GET a PostgREST path (e.g. "team_gear?season_id=eq.145906&select=*"). */
export async function sbSelect(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase select ${path} -> HTTP ${res.status}`);
  return res.json();
}

/** Upsert rows; onConflict is a comma-separated unique-key list. */
export async function sbUpsert(table, rows, onConflict) {
  const q = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const res = await fetch(`${URL}/rest/v1/${table}${q}`, {
    method: 'POST',
    headers: headers({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase upsert ${table} -> HTTP ${res.status} ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
