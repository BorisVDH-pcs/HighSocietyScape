// Minimal Supabase (PostgREST) client — no dependencies, native fetch.
// Writes use the service_role key and bypass RLS; keep it server-side only.

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function assertEnv() {
  const missing = [];
  if (!url) missing.push('SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) {
    throw new Error(
      `Missing env: ${missing.join(', ')}. Copy .env.example to .env and fill it in ` +
        `(and load it, e.g. \`node --env-file=.env scripts/syncToSupabase.mjs\`).`
    );
  }
}

function headers(extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function handle(res, what) {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${what} -> HTTP ${res.status} ${res.statusText}\n${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Upsert rows into `table`. `onConflict` is a comma-separated unique-key list.
 * Returns the affected rows (representation).
 */
export async function upsert(table, rows, onConflict) {
  if (!Array.isArray(rows)) rows = [rows];
  if (rows.length === 0) return [];
  const q = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const res = await fetch(`${url}/rest/v1/${table}${q}`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(rows),
  });
  return handle(res, `upsert ${table}`);
}

/** Select rows with an optional PostgREST filter string (e.g. "season_id=eq.145906"). */
export async function select(table, filter = '', columns = '*') {
  const params = new URLSearchParams();
  params.set('select', columns);
  const q = filter ? `&${filter}` : '';
  const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}${q}`, {
    headers: headers(),
  });
  return handle(res, `select ${table}`);
}
