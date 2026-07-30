import { useEffect, useMemo, useRef, useState } from 'react';
import { loadTeamCharacter, TEAMS, SEASON } from './game/character.js';
import { initBattle, attack, rehydrateBattle, GOBLIN } from './game/combat.js';
import {
  DEFAULT_WEAPON,
  STARTER_WEAPON_IDS,
  weaponById,
  bestOwnedWeapon,
} from './game/weapons.js';
import { loadGear, saveGear } from './game/gear.js';
import { loadBattle, saveBattle } from './game/battle.js';
import BattleScreen from './components/BattleScreen.jsx';

export default function App() {
  const [teamName, setTeamName] = useState('Team 1');
  const character = useMemo(() => loadTeamCharacter(teamName), [teamName]);

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
  const [flash, setFlash] = useState(null);
  const [logoOk, setLogoOk] = useState(true);
  const flashTimer = useRef(null);
  const loadedTeams = useRef(new Set()); // teams whose DB state we've fetched

  const gearFor = (name) =>
    gearByTeam[name] ?? { ownedIds: STARTER_WEAPON_IDS, weaponId: DEFAULT_WEAPON.id };

  const gear = gearFor(teamName);
  const ownedIds = gear.ownedIds;
  const weapon = weaponById(gear.weaponId);
  const ownedWeapons = ownedIds.map(weaponById);

  // The current team's battle: its cached/persisted state, or a fresh fight
  // (built from the live character + the equipped weapon) until one exists.
  const battle = battleByTeam[teamName] ?? initBattle(character, GOBLIN, weapon);

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

  // On first visit to a team, hydrate its gear AND its in-progress battle from
  // Supabase (once). Each seeds only if we don't already hold local state for
  // that team, so in-session changes win over a slow load. Gear loads first so
  // the resumed battle wields the team's persisted loadout.
  useEffect(() => {
    if (loadedTeams.current.has(teamName)) return;
    loadedTeams.current.add(teamName);
    let cancelled = false;
    (async () => {
      const g = await loadGear(SEASON.id, teamName);
      if (cancelled) return;
      if (g) setGearByTeam((m) => (m[teamName] ? m : { ...m, [teamName]: g }));

      const saved = await loadBattle(SEASON.id, teamName);
      if (cancelled || !saved) return;
      const savedWeapon = weaponById(g?.weaponId ?? saved.weaponId);
      setBattleByTeam((m) =>
        m[teamName] ? m : { ...m, [teamName]: rehydrateBattle(character, saved, savedWeapon) }
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [teamName]);

  function flashOnce(who) {
    setFlash(who);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 260);
  }

  // FIGHT: attack with whatever gear is currently equipped.
  function handleAttack() {
    const next = attack(battle);
    if (next.boss.hp < battle.boss.hp) flashOnce('boss');
    else if (next.player.hp < battle.player.hp) flashOnce('player');

    // Absorb any drops into THIS team's owned-gear inventory (deduped), then
    // auto-equip the highest-tier weapon it now owns — so a Steel Sword drop
    // is wielded immediately without opening GEAR. Other teams are unaffected.
    if (next.status === 'won' && next.loot?.length) {
      const merged = [...new Set([...ownedIds, ...next.loot])];
      const best = bestOwnedWeapon(merged);
      const upgrade = (best.tier ?? 0) > (weapon.tier ?? 0);
      updateGear(teamName, { ownedIds: merged, ...(upgrade ? { weaponId: best.id } : {}) });
      if (upgrade) {
        next.player.weapon = best; // reflect the auto-equip in the state we set
        next.log = [
          ...next.log,
          { t: 'loot', text: `${next.player.name} auto-equips the ${best.name} — stronger than the ${weapon.name}!` },
        ];
      }
    }
    updateBattle(teamName, next);
  }

  // GEAR: change loadout (sets the sprite + the style FIGHT uses). No attack.
  function handleEquip(w) {
    updateGear(teamName, { weaponId: w.id });
    updateBattle(teamName, { ...battle, player: { ...battle.player, weapon: w } });
  }

  // Start a fresh fight for a team. Persisted (updateBattle), so reopening the
  // app after a reset shows the fresh fight rather than resuming the old one.
  function reset(name = teamName) {
    const w = weaponById(gearFor(name).weaponId);
    updateBattle(name, initBattle(loadTeamCharacter(name), GOBLIN, w));
    setFlash(null);
  }

  // Switch teams. No reset — each team keeps its own battle (see battleByTeam),
  // so switching away and back preserves an in-progress fight.
  function pickTeam(name) {
    setTeamName(name);
    setFlash(null);
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
        flash={flash}
        owned={ownedWeapons}
        onAttack={handleAttack}
        onEquip={handleEquip}
        onReset={() => reset()}
      />

      <footer className="foot">
        Character derived live from pooled WOM data · {teamName} has real gains;
        empty teams read as level 1.
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
