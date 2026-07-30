import { useState } from 'react';
import { Hero, GoblinSprite } from './Sprite.jsx';
import { weaponById } from '../game/weapons.js';

// Gen-1 style HP bar: "HP" label + bar, with current/max numbers.
function PokeHP({ hp, max }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  const tone = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'low';
  return (
    <div className="phb">
      <div className="phb-row">
        <span className="phb-label">HP</span>
        <span className="phb-track">
          <span className={`phb-fill ${tone}`} style={{ width: `${pct}%` }} />
        </span>
      </div>
      <div className="phb-num">
        {hp}/{max}
      </div>
    </div>
  );
}

export default function BattleScreen({ battle, flash, owned, onAttack, onEquip, onReset }) {
  const { player, boss, status } = battle;
  const over = status !== 'active';
  const [menu, setMenu] = useState('main'); // 'main' | 'gear'
  const [note, setNote] = useState(null);
  const equippedId = player.weapon.id;

  function cmd(which) {
    if (which === 'fight') {
      setNote(null);
      onAttack();
    } else if (which === 'gear') {
      setNote(null);
      setMenu('gear');
    } else if (which === 'item') {
      setNote('You have no items yet — loot drops are coming soon.');
    } else if (which === 'run') {
      setNote(`No! There's no running from a boss!`);
    }
  }

  function equip(w) {
    onEquip(w);
    setMenu('main');
    setNote(`Loadout set: ${w.style.toUpperCase()} (${w.name}).`);
  }

  function next() {
    setMenu('main');
    setNote(null);
    onReset();
  }

  // What the message window shows.
  let lines;
  if (over) {
    if (status === 'won') {
      lines = [`The wild ${boss.name} fainted!`, `${player.name} won the battle!`];
      for (const id of battle.loot ?? []) {
        lines.push(`${weaponById(id).name} was added to your gear!`);
      }
    } else {
      lines = [`${player.name} is out of HP!`, 'Defeated...'];
    }
  } else if (menu === 'gear') {
    lines = ['Choose your loadout.'];
  } else if (note) {
    lines = [note];
  } else if (battle.round > 0) {
    lines = battle.log.slice(-2).map((e) => e.text);
  } else {
    lines = [`What will ${player.name} do?`];
  }

  return (
    <div className="gb">
      <div className="gb-screen">
        <div className="scene">
          {/* enemy info — top-left */}
          <div className="infobox enemy-info">
            <div className="info-name">
              {boss.name.toUpperCase()}
              <span className="lvl">:L{boss.level}</span>
            </div>
            <PokeHP hp={boss.hp} max={boss.maxHp} />
          </div>

          {/* enemy sprite — top-right */}
          <div className="mon enemy-mon">
            <GoblinSprite hurt={flash === 'boss'} />
          </div>

          {/* player sprite — bottom-left (changes with equipped gear) */}
          <div className="mon player-mon">
            <Hero style={player.weapon.style} hurt={flash === 'player'} />
          </div>

          {/* player info — bottom-right */}
          <div className="infobox player-info">
            <div className="info-name">
              {player.name.toUpperCase()}
              <span className="lvl">:L{player.combatLevel}</span>
            </div>
            <PokeHP hp={player.hp} max={player.maxHp} />
          </div>
        </div>

        {/* command / message box */}
        <div className="cmdbox">
          <div className="msg">
            {lines.map((t, i) => (
              <div key={i} className="msg-line">
                {t}
              </div>
            ))}
            {over && <span className="blink">▼</span>}
          </div>

          <div className="menu">
            {over ? (
              <button className="mbtn wide" onClick={next}>
                ▶ NEXT
              </button>
            ) : menu === 'main' ? (
              <div className="grid2">
                <button className="mbtn" onClick={() => cmd('fight')}>FIGHT</button>
                <button className="mbtn" onClick={() => cmd('gear')}>GEAR</button>
                <button className="mbtn" onClick={() => cmd('item')}>ITEM</button>
                <button className="mbtn" onClick={() => cmd('run')}>RUN</button>
              </div>
            ) : (
              <div className="moves">
                {owned.map((w) => (
                  <button
                    key={w.id}
                    className={`mbtn move ${w.id === equippedId ? 'on' : ''}`}
                    onClick={() => equip(w)}
                  >
                    {w.icon} {w.style.toUpperCase()}
                    <span className="mtag">
                      {w.name}
                      {w.power ? ` +${w.power}` : ''}
                    </span>
                  </button>
                ))}
                <button className="mbtn back" onClick={() => setMenu('main')}>
                  ← BACK
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
