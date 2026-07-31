import { useEffect, useRef, useState } from 'react';
import { Hero, BossSprite } from './Sprite.jsx';
import BossMap from './BossMap.jsx';
import { buildSetup, setupStats, SLOTS, itemById } from '../game/weapons.js';
import { BOSS_LADDER } from '../game/combat.js';

// The three combat styles shown in GEAR. Tapping one makes it active AND opens
// its six-slot SET-UP panel.
const STYLE_LIST = [
  { key: 'melee', label: 'MELEE', icon: '⚔️' },
  { key: 'ranged', label: 'RANGED', icon: '🏹' },
  { key: 'magic', label: 'MAGE', icon: '🪄' },
];

const SLOT_LABELS = {
  weapon: 'Weapon',
  armour: 'Armour',
  boots: 'Boots',
  cape: 'Cape',
  amulet: 'Amulet',
  ring: 'Ring',
};

// Format a per-kill drop chance as "1/N (P%)" for the drop-rate panel.
function formatRate(chance) {
  if (!chance || chance <= 0) return '—';
  const denom = Math.max(1, Math.round(1 / chance));
  const pct = chance * 100;
  return `1/${denom} · ${pct < 1 ? pct.toFixed(2) : pct.toFixed(1)}%`;
}

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
  action,
  ownedIds = [],
  auto,
  maxUnlocked = 0,
  bossKills = 0,
  onAttack,
  onUseFood,
  onUsePotion,
  onSelectStyle,
  onReset,
  onSelectBoss,
  onToggleAuto,
}) {
  const { player, boss, status } = battle;
  const over = status !== 'active';
  const [menu, setMenu] = useState('main'); // 'main' | 'gear' | 'setup' | 'bag' | 'map'
  const [note, setNote] = useState(null);
  const [showDrops, setShowDrops] = useState(false); // drop-rate panel toggle
  const [setupStyle, setSetupStyle] = useState(null);
  const equippedStyle = player.weapon.style;

  // ---- Attack animation timeline -------------------------------------------
  // Each round (a new `action.seq`) plays out in two phases so the exchange
  // reads clearly and slowly: the player swings/shoots/casts and the boss
  // recoils, THEN the boss lunges back and the player recoils. `anim` drives the
  // sprite motion classes, hurt flashes, and any in-flight projectile.
  const [anim, setAnim] = useState({});
  const timers = useRef([]);
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!action) {
      setAnim({}); // new fight / team switch: clear any lingering motion
      return undefined;
    }
    const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));
    const { playerStyle, playerLanded, bossAttacked, bossLanded } = action;
    const connect = playerStyle === 'melee' ? 240 : 430; // when the hit/projectile lands

    // Phase A — player attacks.
    setAnim({
      pAtk: playerStyle,
      bAtk: false,
      pHurt: false,
      bHurt: false,
      proj: playerStyle === 'melee' ? null : playerStyle,
    });
    at(connect, () => setAnim((a) => ({ ...a, proj: null, bHurt: !!playerLanded })));
    at(500, () => setAnim((a) => ({ ...a, pAtk: null })));
    at(connect + 260, () => setAnim((a) => ({ ...a, bHurt: false })));

    // Phase B — boss retaliates (only if it survived the player's hit).
    if (bossAttacked) {
      at(640, () => setAnim((a) => ({ ...a, bAtk: true })));
      at(880, () => setAnim((a) => ({ ...a, pHurt: !!bossLanded })));
      at(1140, () => setAnim((a) => ({ ...a, bAtk: false, pHurt: false })));
    }

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [action?.seq]);

  // The set-up currently being viewed (defaults to the equipped style) and its
  // aggregate combat bonuses.
  const viewStyle = setupStyle ?? equippedStyle;
  const setup = buildSetup(ownedIds, viewStyle);
  const stats = setupStats(setup);

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
      setNote(null);
      setMenu('bag');
    } else if (which === 'map') {
      setNote(null);
      setMenu('map');
    }
  }

  // GEAR: pick a style — make it active (auto-equips its best gear) and show its
  // full six-slot set-up.
  function openStyle(style) {
    onSelectStyle(style);
    setSetupStyle(style);
    setNote(null);
    setMenu('setup');
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
        lines.push(`${itemById(id)?.name ?? id} was added to your gear!`);
      }
      lines.push(
        auto ? 'AUTO is on — FIGHT AGAIN keeps farming.' : 'FIGHT AGAIN to farm it, or open the MAP.'
      );
    } else {
      lines = [`${player.name} is out of HP!`, 'Defeated...'];
    }
  } else if (menu === 'gear') {
    lines = ['Choose a combat style.'];
  } else if (menu === 'setup') {
    lines = [`${viewStyle.toUpperCase()} set-up.`];
  } else if (menu === 'bag') {
    // Show the last combat result (a BAG action costs a turn) or a prompt.
    lines = battle.round > 0 ? battle.log.slice(-2).map((e) => e.text) : ['Use an item.'];
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

  if (menu === 'map') {
    return (
      <div className="gb">
        <div className="gb-screen">
          <BossMap
            bosses={BOSS_LADDER}
            currentId={boss.id}
            maxUnlocked={maxUnlocked}
            onSelect={(id) => travel(id)}
            onClose={() => setMenu('main')}
          />
        </div>
      </div>
    );
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
              <button
                className={`dropinfo-btn ${showDrops ? 'on' : ''}`}
                onClick={() => setShowDrops((s) => !s)}
                title="Drop rates"
                aria-label="Show this boss's drop rates"
              >
                ⓘ
              </button>
            </div>
            <PokeHP hp={boss.hp} max={boss.maxHp} />
          </div>

          {/* drop-rate panel — toggled by the ⓘ button */}
          {showDrops && (
            <div className="drops-overlay" role="dialog" aria-label="Drop rates">
              <div className="drops-head">
                <span>{boss.name.toUpperCase()} — DROPS</span>
                <button
                  className="drops-x"
                  onClick={() => setShowDrops(false)}
                  aria-label="Close drop rates"
                >
                  ✕
                </button>
              </div>
              {/* overview: total kills of this boss + how many of its drops the
                  team has already collected */}
              {(() => {
                const drops = boss.drops ?? [];
                const collected = drops.filter((d) => ownedIds.includes(d.itemId)).length;
                return (
                  <div className="drops-sub">
                    <span>
                      ☠ {bossKills} {bossKills === 1 ? 'kill' : 'kills'}
                    </span>
                    {drops.length > 0 && (
                      <span>
                        {collected}/{drops.length} collected
                      </span>
                    )}
                  </div>
                );
              })()}
              <div className="drops-list">
                {(boss.drops ?? []).length === 0 ? (
                  <div className="drop-row">
                    <span className="drop-name">No drops — this boss gives nothing.</span>
                  </div>
                ) : (
                  boss.drops.map((d) => {
                    const it = itemById(d.itemId);
                    const owned = ownedIds.includes(d.itemId);
                    return (
                      <div key={d.itemId} className="drop-row">
                        <span className={`drop-name ${owned ? 'owned' : ''}`}>
                          {it?.icon ?? '❔'} {it?.name ?? d.itemId}
                          {owned && ' ✓'}
                        </span>
                        <span className="drop-rate">{formatRate(d.chance)}</span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="drops-foot">Chance per kill · ✓ already obtained.</div>
            </div>
          )}

          {/* in-flight projectile: arrow (ranged) / spell (magic) */}
          {anim.proj && (
            <div className={`projectile ${anim.proj} fly`} aria-hidden="true">
              {anim.proj === 'ranged' ? '➶' : '✦'}
            </div>
          )}

          {/* enemy sprite — top-right */}
          <div className={`mon enemy-mon ${anim.bAtk ? 'atk-boss' : ''}`}>
            <BossSprite id={boss.id} hurt={!!anim.bHurt} />
          </div>

          {/* player sprite — bottom-left (changes with equipped gear) */}
          <div className={`mon player-mon ${anim.pAtk ? `atk-${anim.pAtk}` : ''}`}>
            <Hero style={player.weapon.style} hurt={!!anim.pHurt} />
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
            {menu === 'gear' ? (
              <div className="moves">
                {STYLE_LIST.map((st) => (
                  <button
                    key={st.key}
                    className={`mbtn move ${st.key === equippedStyle ? 'on' : ''}`}
                    onClick={() => openStyle(st.key)}
                  >
                    {st.icon} {st.label}
                    <span className="mtag">{st.key === equippedStyle ? 'active' : 'view set-up'}</span>
                  </button>
                ))}
                <button className="mbtn back" onClick={() => setMenu('main')}>
                  ← BACK
                </button>
              </div>
            ) : menu === 'setup' ? (
              <div className="setup">
                <div className="setlist">
                  {SLOTS.map((slot) => {
                    const it = setup[slot];
                    return (
                      <div key={slot} className="setrow">
                        <span className="setslot">{SLOT_LABELS[slot]}</span>
                        <span className="setitem">{it ? `${it.icon} ${it.name}` : '—'}</span>
                        <span className="settier">{it ? `T${it.tier}` : ''}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="setstats">
                  <span>⚔ +{stats.power}</span>
                  <span>🛡 +{stats.defence}</span>
                  <span>🎯 +{Math.round((stats.accuracy ?? 0) * 100)}%</span>
                </div>
                <button className="mbtn back" onClick={() => setMenu('gear')}>
                  ← BACK
                </button>
              </div>
            ) : menu === 'bag' && !over ? (
              <div className="moves">
                <button
                  className="mbtn move"
                  onClick={onUseFood}
                  disabled={(player.food ?? 0) <= 0}
                >
                  🍖 EAT FOOD
                  <span className="mtag">
                    x{player.food ?? 0} · +{player.foodHeal ?? 0} HP
                  </span>
                </button>
                <button
                  className="mbtn move"
                  onClick={onUsePotion}
                  disabled={(player.potion ?? 0) <= 0}
                >
                  🧪 COMBAT BREW
                  <span className="mtag">
                    {(player.buff?.power ?? 0) > 0 ? `active +${player.buff.power}` : `x${player.potion ?? 0} · +${player.potionPower ?? 0} pow`}
                  </span>
                </button>
                <button className="mbtn back" onClick={() => setMenu('main')}>
                  ← BACK
                </button>
              </div>
            ) : over ? (
              <>
                <div className="grid2">
                  <button className="mbtn" onClick={again}>{againLabel}</button>
                  <button className="mbtn" onClick={() => setMenu('map')}>🗺 MAP</button>
                </div>
                <button
                  className={`mbtn wide auto ${auto ? 'on' : ''}`}
                  onClick={onToggleAuto}
                >
                  {auto ? '■ STOP AUTO' : '⚔ AUTO-FIGHT'}
                </button>
              </>
            ) : (
              <>
                <div className="grid2">
                  <button className="mbtn" onClick={() => cmd('fight')}>FIGHT</button>
                  <button className="mbtn" onClick={() => cmd('gear')}>GEAR</button>
                  <button className="mbtn" onClick={() => cmd('item')}>BAG</button>
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
