import { useState } from 'react';
import { Hero, BossSprite } from './Sprite.jsx';
import { weaponById } from '../game/weapons.js';
import { BOSS_LADDER } from '../game/combat.js';

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

export default function BattleScreen({
  battle,
  flash,
  owned,
  auto,
  maxUnlocked = 0,
  onAttack,
  onEquip,
  onReset,
  onSelectBoss,
  onToggleAuto,
}) {
  const { player, boss, status } = battle;
  const over = status !== 'active';
  const [menu, setMenu] = useState('main'); // 'main' | 'gear' | 'map'
  const [note, setNote] = useState(null);
  const equippedStyle = player.weapon.style;

  // GEAR is a loadout picker: one entry per style, each resolving to the
  // strongest weapon you own of that style (you never pick a weaker tier).
  const loadouts = ['melee', 'ranged', 'magic']
    .map((style) => {
      const pool = owned.filter((w) => w.style === style);
      if (pool.length === 0) return null;
      return pool.reduce((best, w) => ((w.tier ?? 0) > (best.tier ?? 0) ? w : best));
    })
    .filter(Boolean);

  function cmd(which) {
    if (which === 'fight') {
      setNote(null);
      onAttack();
    } else if (which === 'auto') {
      setNote(null);
      onToggleAuto();
    } else if (which === 'gear') {
      setNote(null);
      setMenu('gear');
    } else if (which === 'item') {
      setNote('You have no items yet — loot drops are coming soon.');
    } else if (which === 'map') {
      setNote(null);
      setMenu('map');
    }
  }

  function equip(w) {
    onEquip(w);
    setMenu('main');
    setNote(`Loadout set: ${w.style.toUpperCase()} (${w.name}).`);
  }

  // Re-fight the same boss (post-battle button). Stay put to farm drops.
  function again() {
    setMenu('main');
    setNote(null);
    onReset();
  }

  // Travel to a chosen boss via the MAP.
  function travel(bossId) {
    setMenu('main');
    setNote(null);
    onSelectBoss(bossId);
  }

  const won = status === 'won';
  const againLabel = won ? '↺ FIGHT AGAIN' : '↺ RETRY';

  // What the message window shows.
  let lines;
  if (over) {
    if (won) {
      lines = [`The wild ${boss.name} fainted!`];
      for (const id of battle.loot ?? []) {
        lines.push(`${weaponById(id).name} was added to your gear!`);
      }
      lines.push('FIGHT AGAIN to farm it, or open the MAP.');
    } else {
      lines = [`${player.name} is out of HP!`, 'Defeated...'];
    }
  } else if (menu === 'gear') {
    lines = ['Choose your loadout.'];
  } else if (menu === 'map') {
    lines = ['Where to? Choose a boss.'];
  } else if (auto) {
    lines = battle.round > 0 ? battle.log.slice(-2).map((e) => e.text) : ['Auto-fighting...'];
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
            <BossSprite id={boss.id} hurt={flash === 'boss'} />
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
            {menu === 'map' ? (
              <div className="moves">
                {BOSS_LADDER.map((b, i) => {
                  const locked = i > maxUnlocked;
                  return (
                    <button
                      key={b.id}
                      className={`mbtn move ${b.id === boss.id ? 'on' : ''} ${locked ? 'locked' : ''}`}
                      disabled={locked}
                      onClick={() => travel(b.id)}
                    >
                      {locked ? '🔒 ' : ''}
                      {b.name.toUpperCase()}
                      <span className="mtag">{locked ? 'locked' : `:L${b.level}`}</span>
                    </button>
                  );
                })}
                <button className="mbtn back" onClick={() => setMenu('main')}>
                  ← BACK
                </button>
              </div>
            ) : menu === 'gear' ? (
              <div className="moves">
                {loadouts.map((w) => (
                  <button
                    key={w.style}
                    className={`mbtn move ${w.style === equippedStyle ? 'on' : ''}`}
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
            ) : over ? (
              <div className="grid2">
                <button className="mbtn" onClick={again}>{againLabel}</button>
                <button className="mbtn" onClick={() => setMenu('map')}>🗺 MAP</button>
              </div>
            ) : (
              <>
                <div className="grid2">
                  <button className="mbtn" onClick={() => cmd('fight')}>FIGHT</button>
                  <button className="mbtn" onClick={() => cmd('gear')}>GEAR</button>
                  <button className="mbtn" onClick={() => cmd('item')}>ITEM</button>
                  <button className="mbtn" onClick={() => cmd('map')}>MAP</button>
                </div>
                <button
                  className={`mbtn wide auto ${auto ? 'on' : ''}`}
                  onClick={() => cmd('auto')}
                >
                  {auto ? '■ STOP AUTO' : '⚔ AUTO-FIGHT'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
