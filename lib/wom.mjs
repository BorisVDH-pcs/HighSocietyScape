// Thin Wise Old Man API client. Read-only. No dependencies (native fetch,
// Node 18+). WOM returns 403 without a descriptive User-Agent, so we always
// send one (see CLAUDE.md).

const BASE = 'https://api.wiseoldman.net/v2';
const USER_AGENT =
  process.env.WOM_USER_AGENT ||
  'HighSocietyScape (github.com/BorisVDH-pcs/HighSocietyScape)';
// Optional API key. Without one WOM allows 20 req/min; with one, 100 req/min.
// Sent as the `x-api-key` header. Request a key via the WOM Discord.
const API_KEY = process.env.WOM_API_KEY || '';
const MAX_RETRIES = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET a WOM endpoint. Retries on 429 (rate limit), honoring the `Retry-After`
 * header when present and otherwise backing off exponentially. This is what
 * makes a full multi-team fetch complete reliably even without an API key.
 */
async function womGet(path, attempt = 0) {
  const headers = { 'User-Agent': USER_AGENT };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(`${BASE}${path}`, { headers });

  if (res.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000 + 250 // header is in seconds; pad slightly
        : Math.min(30000, 2 ** attempt * 1000); // exp backoff, cap 30s
    await sleep(waitMs);
    return womGet(path, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`WOM ${path} -> HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Full competition object, including participations + team names. */
export function getCompetition(id) {
  return womGet(`/competitions/${id}`);
}

/**
 * Per-skill and per-boss GAINS for one player over [startDate, endDate].
 * Returns { skills: {name: gainedXp}, bosses: {name: gainedKc} }.
 * Negative gains (WOM "unranked" sentinels) are clamped to 0.
 */
export async function getPlayerGains(username, startDate, endDate) {
  const q = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const data = await womGet(`/players/${encodeURIComponent(username)}/gained?${q}`);
  const skills = {};
  const bosses = {};
  const s = data?.data?.skills;
  const b = data?.data?.bosses;
  if (s) {
    for (const [name, v] of Object.entries(s)) {
      skills[name] = Math.max(0, v?.experience?.gained ?? 0);
    }
  }
  if (b) {
    for (const [name, v] of Object.entries(b)) {
      bosses[name] = Math.max(0, v?.kills?.gained ?? 0);
    }
  }
  return { skills, bosses };
}

/** Group a competition's participations into { teamName: [participation] }. */
export function groupByTeam(competition) {
  const teams = {};
  for (const p of competition.participations ?? []) {
    const name = p.teamName ?? '(no team)';
    (teams[name] ??= []).push(p);
  }
  return teams;
}
