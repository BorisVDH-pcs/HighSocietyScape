import { useMemo, useRef, useState } from 'react';
import { loadTeamCharacter, TEAMS } from './game/character.js';
import { initBattle, attack, GOBLIN } from './game/combat.js';
import {
  DEFAULT_WEAPON,
  STARTER_WEAPON_IDS,
  weaponById,
  bestOwnedWeapon,
} from './game/weapons.js';
import BattleScreen from './components/BattleScreen.jsx';

export default function App() {
  const [teamName, setTeamName] = useState('Team 1');
  const character = useMemo(() => loadTeamCharacter(teamName), [teamName]);

  // Gear is PER TEAM — each team plays its own game (own inventory + equipped
  // weapon). Keyed by team name; unseen teams start with the starter loadout.
  // NB: this lives in session state only and resets on reload — persisting it
  // per team to Supabase is the "Persist inventory" step in HANDOVER.md.
  const [gearByTeam, setGearByTeam] = useState({});
  const [battle, setBattle] = useState(() => initBattle(character, GOBLIN, DEFAULT_WEAPON));
  const [flash, setFlash] = useState(null);
  const [logoOk, setLogoOk] = useState(true);
  const flashTimer = useRef(null);

  const gearFor = (name) =>
    gearByTeam[name] ?? { ownedIds: STARTER_WEAPON_IDS, weaponId: DEFAULT_WEAPON.id };

  const gear = gearFor(teamName);
  const ownedIds = gear.ownedIds;
  const weapon = weaponById(gear.weaponId);
  const ownedWeapons = ownedIds.map(weaponById);

  // Merge a patch into one team's gear without touching the others.
  function updateGear(name, patch) {
    setGearByTeam((m) => ({ ...m, [name]: { ...gearFor(name), ...patch } }));
  }

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
    setBattle(next);
  }

  // GEAR: change loadout (sets the sprite + the style FIGHT uses). No attack.
  function handleEquip(w) {
    updateGear(teamName, { weaponId: w.id });
    setBattle((prev) => ({ ...prev, player: { ...prev.player, weapon: w } }));
  }

  function reset(name = teamName) {
    const w = weaponById(gearFor(name).weaponId);
    setBattle(initBattle(loadTeamCharacter(name), GOBLIN, w));
    setFlash(null);
  }

  function pickTeam(name) {
    setTeamName(name);
    reset(name);
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
