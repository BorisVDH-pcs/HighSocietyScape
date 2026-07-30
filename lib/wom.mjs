// Thin Wise Old Man API client. Read-only. No dependencies (native fetch,
// Node 18+). WOM returns 403 without a descriptive User-Agent, so we always
// send one (see CLAUDE.md).

const BASE = 'https://api.wiseoldman.net/v2';
const USER_AGENT =
  process.env.WOM_USER_AGENT ||
  'HighSocietyScape (github.com/BorisVDH-pcs/HighSocietyScape)';

async function womGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
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
