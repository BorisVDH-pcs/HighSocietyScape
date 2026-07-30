import { useMemo, useRef, useState } from 'react';
import { loadTeamCharacter, TEAMS, SEASON } from './game/character.js';
import { initBattle, attack, GOBLIN } from './game/combat.js';
import { DEFAULT_WEAPON } from './game/weapons.js';
import BattleScreen from './components/BattleScreen.jsx';

export default function App() {
  const [teamName, setTeamName] = useState('Team 1');
  const character = useMemo(() => loadTeamCharacter(teamName), [teamName]);

  const [weapon, setWeapon] = useState(DEFAULT_WEAPON);
  const [battle, setBattle] = useState(() => initBattle(character, GOBLIN, DEFAULT_WEAPON));
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);

  function flashOnce(who) {
    setFlash(who);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 260);
  }

  // FIGHT: attack with whatever gear is currently equipped.
  function handleAttack() {
    setBattle((prev) => {
      const next = attack(prev);
      if (next.boss.hp < prev.boss.hp) flashOnce('boss');
      else if (next.player.hp < prev.player.hp) flashOnce('player');
      return next;
    });
  }

  // GEAR: change loadout (sets the sprite + the style FIGHT uses). No attack.
  function handleEquip(w) {
    setWeapon(w);
    setBattle((prev) => ({ ...prev, player: { ...prev.player, weapon: w } }));
  }

  function reset(name = teamName) {
    setBattle(initBattle(loadTeamCharacter(name), GOBLIN, weapon));
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
          <span className="logo">⚔️</span>
          <div>
            <h1>HighSocietyScape</h1>
            <p className="season">{SEASON.title}</p>
          </div>
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
