import { useEffect, useMemo, useRef, useState } from 'react';
import { loadTeamCharacter, loadTeamCharacterLive, TEAMS, SEASON } from './game/character.js';
import {
  initBattle,
  attack,
  rehydrateBattle,
  bossById,
  bossIndex,
  BOSS_LADDER,
  GOBLIN,
} from './game/combat.js';
import {
  DEFAULT_WEAPON,
  STARTER_GEAR_IDS,
  weaponById,
  bestOwnedWeapon,
  buildSetup,
  setupStats,
} from './game/weapons.js';
import { loadGear, saveGear } from './game/gear.js';
import { loadBattle, saveBattle } from './game/battle.js';
import { loadProgress, saveProgress } from './game/progress.js';
import { isSupabaseConfigured } from './game/supabase.js';
import BattleScreen from './components/BattleScreen.jsx';

// One auto-fight attack per this many ms — long enough for a round's attack
// animations (player swing → boss retaliation) to play out. Also the visual
// pace knob for how fast fights feel.
const ROUND_MS = 1200;

export default function App() {
  const [teamName, setTeamName] = useState('Team 1');
  // Character stats are snapshot-derived instantly (seed + offline fallback),
  // then replaced PER TEAM with the live Supabase read when it resolves (see
  // the hydration effect). charByTeam holds any live-loaded characters.
  const snapshotChar = useMemo(() => loadTeamCharacter(teamName), [teamName]);
  const [charByTeam, setCharByTeam] = useState({});
  const character = charByTeam[teamName] ?? snapshotChar;
  const characterFor = (name) => charByTeam[name] ?? loadTeamCharacter(name);

  // Gear is PER TEAM — each team plays its own game (own inventory + equipped
  // weapon). Keyed by team name; unseen teams start with the starter loadout.
  // When Supabase is configured it's loaded from / saved to the team_gear
  // table (persists across reloads + players); otherwise it lives in session
  // state only. See web/src/game/gear.js.
  const [gearByTeam, setGearByTeam] = useState({});
  // Battle state is PER TEAM too, so switching teams preserves each team's
  // in-progress fight (and, via Supabase, resumes it after a reload). Keyed by
  // team name; a team with no entry yet falls back to a fresh Goblin fight.
  const [battleByTeam, setBattleByTeam] = useState({});
  // Boss-ladder unlock progress PER TEAM: the highest ladder index the team can
  // fight (0 = only the Goblin). Beating rung i unlocks i+1. Persisted to the
  // team_progress table; defaults to 0 when unloaded / unconfigured.
  const [progressByTeam, setProgressByTeam] = useState({});
  // The last round's events, fed to BattleScreen to drive attack animations.
  // `seq` (a monotonic id) guarantees each attack re-triggers the animation even
  // when the derived fields repeat.
  const [action, setAction] = useState(null);
  const actionSeq = useRef(0);
  const [logoOk, setLogoOk] = useState(true);
  const [auto, setAuto] = useState(false); // AUTO-fight: keep attacking until 0 HP
  const loadedTeams = useRef(new Set()); // teams whose DB state we've fetched

  const gearFor = (name) =>
    gearByTeam[name] ?? { ownedIds: STARTER_GEAR_IDS, weaponId: DEFAULT_WEAPON.id };

  const gear = gearFor(teamName);
  const ownedIds = gear.ownedIds;
  const weapon = weaponById(gear.weaponId);
  const activeStyle = weapon.style;
  // The full auto-equipped setup (best owned piece per slot) for the active style.
  const setup = buildSetup(ownedIds, activeStyle);

  // The current team's battle: its cached/persisted state, or a fresh fight
  // (built from the live character + the equipped setup) until one exists.
  const battle = battleByTeam[teamName] ?? initBattle(character, GOBLIN, setup);

  // Merge a patch into one team's gear (never touching the others) and persist
  // it. saveGear is a graceful no-op when Supabase isn't configured.
  function updateGear(name, patch) {
    const nextGear = { ...gearFor(name), ...patch };
    setGearByTeam((m) => ({ ...m, [name]: nextGear }));
    saveGear(SEASON.id, name, nextGear);
  }

  // Set one team's battle (never touching the others) and persist it, so
  // closing the app mid-fight and returning resumes the same HP/round/log.
  // saveBattle is a graceful no-op when Supabase isn't configured.
  function updateBattle(name, next) {
    setBattleByTeam((m) => ({ ...m, [name]: next }));
    saveBattle(SEASON.id, name, next);
  }

  const LAST_BOSS = BOSS_LADDER.length - 1;
  const unlockedFor = (name) => progressByTeam[name] ?? 0;

  // Raise a team's unlocked-ladder index (never lowers it) and persist it.
  function unlockUpTo(name, index) {
    const target = Math.min(LAST_BOSS, index);
    if (unlockedFor(name) >= target) return;
    setProgressByTeam((m) => ({ ...m, [name]: Math.max(m[name] ?? 0, target) }));
    saveProgress(SEASON.id, name, target);
  }

  // On first visit to a team, hydrate its live character, gear AND in-progress
  // battle from Supabase (once). Each seeds only if we don't already hold local
  // state for that team, so in-session changes win over a slow load. Order
  // matters: the live character loads first so the resumed battle is rebuilt
  // with current stats, and gear before the battle so it wields the persisted
  // loadout.
  useEffect(() => {
    if (loadedTeams.current.has(teamName)) return;
    let cancelled = false;
    (async () => {
      const liveChar = await loadTeamCharacterLive(teamName);
      if (cancelled) return;
      if (liveChar) setCharByTeam((m) => (m[teamName] ? m : { ...m, [teamName]: liveChar }));
      const char = liveChar ?? snapshotChar;

      const g = await loadGear(SEASON.id, teamName);
      if (cancelled) return;
      if (g) setGearByTeam((m) => (m[teamName] ? m : { ...m, [teamName]: g }));

      const savedProgress = await loadProgress(SEASON.id, teamName);
      if (cancelled) return;

      const saved = await loadBattle(SEASON.id, teamName);
      if (cancelled) return;
      if (saved) {
        const rebuildIds = g?.ownedIds ?? STARTER_GEAR_IDS;
        const rebuildStyle = weaponById(g?.weaponId ?? saved.weaponId).style;
        const rebuildSetup = buildSetup(rebuildIds, rebuildStyle);
        setBattleByTeam((m) =>
          m[teamName] ? m : { ...m, [teamName]: rehydrateBattle(char, saved, rebuildSetup) }
        );
      }

      // Seed unlock progress, but never below the rung of the resumed fight (so
      // a persisted battle can't leave you "fighting a locked boss"). Only seeds
      // if we don't already hold in-session progress for this team.
      const resumedIdx = saved ? bossIndex(saved.bossId) : 0;
      const seed = Math.max(savedProgress ?? 0, resumedIdx, 0);
      setProgressByTeam((m) => (m[teamName] !== undefined ? m : { ...m, [teamName]: seed }));

      // Mark loaded only AFTER a completed (non-cancelled) load. Doing this at
      // the top would break React StrictMode's mount→unmount→remount in dev: the
      // first run adds the flag then gets cancelled, and the second run skips —
      // so nothing ever loads and progress looks "reset" on every reload.
      loadedTeams.current.add(teamName);
    })();
    return () => {
      cancelled = true;
    };
  }, [teamName]);

  // AUTO-fight is a persistent MODE: while enabled and the current fight is
  // active, throw one attack every ROUND_MS so each attack animation can play
  // out before the next. When the fight ends it stops attacking but STAYS ARMED
  // — so hitting FIGHT AGAIN resumes auto-fighting for hands-off farming. It only
  // turns off on STOP or a team switch. Re-runs after each attack (and each new
  // fight) because `battle` is a dependency, chaining swings until it's over.
  useEffect(() => {
    if (!auto || battle.status !== 'active') return undefined;
    const t = setTimeout(() => handleAttack(), ROUND_MS);
    return () => clearTimeout(t);
  }, [auto, battle]);

  // FIGHT: attack with whatever gear is currently equipped.
  function handleAttack() {
    const next = attack(battle);

    // Describe this round for BattleScreen's attack animations. The boss only
    // retaliates if it survived the player's hit (status still 'active' or
    // 'lost'); on 'won' it never swings back.
    setAction({
      seq: (actionSeq.current += 1),
      playerStyle: next.player.weapon.style,
      playerLanded: next.boss.hp < battle.boss.hp,
      bossAttacked: next.status !== 'won',
      bossLanded: next.player.hp < battle.player.hp,
    });

    // On a win, unlock the next rung of the ladder for this team (MAP gates
    // bosses beyond the highest unlocked). No-op once already unlocked.
    if (next.status === 'won') unlockUpTo(teamName, bossIndex(next.boss.id) + 1);

    // Absorb any drops (weapons AND armour/accessories) into THIS team's owned
    // gear, deduped. Armour auto-applies to the setup on the next fight; keep the
    // current style but auto-equip its best weapon if a drop upgraded it. Other
    // teams are unaffected. The combat log already lists each individual drop.
    if (next.status === 'won' && next.loot?.length) {
      const merged = [...new Set([...ownedIds, ...next.loot])];
      const bestW = bestOwnedWeapon(merged, weapon.style);
      const upgrade = (bestW.tier ?? 0) > (weapon.tier ?? 0);
      updateGear(teamName, { ownedIds: merged, ...(upgrade ? { weaponId: bestW.id } : {}) });
    }
    updateBattle(teamName, next);
  }

  // GEAR: switch active combat style. Auto-equips that style's best weapon and
  // rebuilds the live battle's setup + bonuses (best owned piece per slot). This
  // also swaps the hero sprite (which follows the weapon's style). No attack.
  function handleStyle(style) {
    const w = bestOwnedWeapon(ownedIds, style);
    const nextSetup = buildSetup(ownedIds, style);
    updateGear(teamName, { weaponId: w.id });
    updateBattle(teamName, {
      ...battle,
      player: {
        ...battle.player,
        weapon: nextSetup.weapon,
        setup: nextSetup,
        bonus: setupStats(nextSetup),
      },
    });
  }

  // Re-fight the CURRENT boss from full HP (used by the post-battle button on
  // both win and loss) — the team stays put so it can farm a boss for drops
  // rather than being pushed up the ladder. Persisted so reopening shows this
  // fresh fight, not the finished one. Advancing to another boss is a manual
  // choice via MAP (selectBoss).
  function reset(name = teamName) {
    const cur = battleByTeam[name];
    const boss = cur ? bossById(cur.boss.id) : GOBLIN;
    startFight(name, boss);
  }

  // MAP: start a fresh fight against a chosen boss — but only if it's unlocked
  // (index within the team's progress). Locked picks are ignored (the UI also
  // disables them).
  function selectBoss(name, bossId) {
    if (bossIndex(bossId) > unlockedFor(name)) return;
    startFight(name, bossById(bossId));
  }

  // Shared: begin a fresh full-HP fight vs `boss` for a team and persist it.
  // Deliberately does NOT touch `auto` — if AUTO mode is on it carries into the
  // new fight (FIGHT AGAIN keeps farming); STOP or a team switch turns it off.
  function startFight(name, boss) {
    const g = gearFor(name);
    const style = weaponById(g.weaponId).style;
    const s = buildSetup(g.ownedIds, style);
    updateBattle(name, initBattle(characterFor(name), boss, s));
    setAction(null);
  }

  // Switch teams. No reset — each team keeps its own battle (see battleByTeam),
  // so switching away and back preserves an in-progress fight. Auto-fight is a
  // global toggle, so stop it when changing teams.
  function pickTeam(name) {
    setTeamName(name);
    setAction(null);
    setAuto(false);
  }

  const maxed = character.maxedSkills.length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          {logoOk ? (
            <img
              src="/logo.png"
              alt="High Society Scape"
              className="brandlogo"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <h1 className="wordmark">
              High <span>Society</span> Scape
            </h1>
          )}
        </div>
        <label className="teampick">
          Team
          <select value={teamName} onChange={(e) => pickTeam(e.target.value)}>
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="statstrip">
        <Stat label="Combat" value={character.combatLevel} />
        <Stat label="Total level" value={character.totalLevel} />
        <Stat label="Skills maxed" value={`${maxed}/24`} />
        <Stat label="Attack" value={character.skills.attack?.level ?? 1} />
        <Stat label="Strength" value={character.skills.strength?.level ?? 1} />
        <Stat label="Ranged" value={character.skills.ranged?.level ?? 1} />
        <Stat label="Magic" value={character.skills.magic?.level ?? 1} />
        <Stat label="Hitpoints" value={character.skills.hitpoints?.level ?? 1} />
      </section>

      <BattleScreen
        battle={battle}
        action={action}
        ownedIds={ownedIds}
        auto={auto}
        maxUnlocked={unlockedFor(teamName)}
        onAttack={handleAttack}
        onSelectStyle={handleStyle}
        onReset={() => reset()}
        onSelectBoss={(id) => selectBoss(teamName, id)}
        onToggleAuto={() => setAuto((a) => !a)}
      />

      <footer className="foot">
        <span className={`savetag ${isSupabaseConfigured ? 'on' : 'off'}`}>
          {isSupabaseConfigured ? '☁ Cloud save on' : '⚠ Session only — set web/.env'}
        </span>
      </footer>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
