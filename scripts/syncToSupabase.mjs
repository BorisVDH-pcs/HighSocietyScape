#!/usr/bin/env node
// Push a cached team snapshot (data/<competitionId>-latest.json) into Supabase.
// Idempotent: safe to run repeatedly; rows are upserted, not duplicated.
//
// Usage (Node 18+):
//   node --env-file=.env scripts/syncToSupabase.mjs [competitionId]
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment.
// Generate the snapshot first with scripts/fetchTeamData.mjs.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assertEnv, upsert } from '../lib/supabase.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

async function main() {
  assertEnv();

  const compId = process.argv[2] || process.env.WOM_COMPETITION_ID || '145906';
  const snapshotPath = join(REPO_ROOT, 'data', `${compId}-latest.json`);
  const snap = JSON.parse(readFileSync(snapshotPath, 'utf8'));

  // 1) Season.
  await upsert(
    'seasons',
    {
      id: snap.competitionId,
      title: snap.title,
      metric: snap.metric ?? null,
      starts_at: snap.window.start,
      ends_at: snap.window.end,
    },
    'id'
  );

  // 2) Teams — upsert and read back the generated uuids by (season_id, name).
  const teamNames = Object.keys(snap.teams);
  const teamRows = await upsert(
    'teams',
    teamNames.map((name) => ({
      season_id: snap.competitionId,
      name,
      member_count: snap.teams[name].memberCount,
    })),
    'season_id,name'
  );
  const teamIdByName = Object.fromEntries(teamRows.map((t) => [t.name, t.id]));

  // 3) Members, skills, bosses for each team.
  let members = [];
  let skills = [];
  let bosses = [];
  for (const name of teamNames) {
    const teamId = teamIdByName[name];
    const t = snap.teams[name];

    for (const displayName of t.members ?? []) {
      members.push({
        team_id: teamId,
        username: String(displayName).toLowerCase(),
        display_name: displayName,
      });
    }
    for (const [skill, s] of Object.entries(t.skills)) {
      skills.push({ team_id: teamId, skill, pooled_xp: s.xp });
    }
    for (const [boss, kc] of Object.entries(t.bosses ?? {})) {
      bosses.push({ team_id: teamId, boss, pooled_kc: kc });
    }
  }

  await upsert('team_members', members, 'team_id,username');
  await upsert('team_skills', skills, 'team_id,skill');
  await upsert('team_bosses', bosses, 'team_id,boss');

  console.log(
    `Synced season ${snap.competitionId} "${snap.title}": ` +
      `${teamNames.length} teams, ${members.length} members, ` +
      `${skills.length} skill rows, ${bosses.length} boss rows.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
