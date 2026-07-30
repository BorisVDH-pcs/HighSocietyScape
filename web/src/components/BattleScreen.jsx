import HealthBar from './HealthBar.jsx';
import CombatLog from './CombatLog.jsx';
import { HeroSprite, GoblinSprite } from './Sprite.jsx';

export default function BattleScreen({ battle, flash, onAttack, onReset }) {
  const { player, boss, status } = battle;
  const over = status !== 'active';

  return (
    <div className="battle">
      <div className="arena">
        {/* Enemy (top-right) */}
        <div className="combatant enemy">
          <div className="nameplate">
            <span className="cname">{boss.name}</span>
            <span className="ctag">boss</span>
          </div>
          <HealthBar hp={boss.hp} maxHp={boss.maxHp} align="right" />
          <GoblinSprite hurt={flash === 'boss'} />
        </div>

        <div className="vs">VS</div>

        {/* Player (bottom-left) */}
        <div className="combatant player">
          <HeroSprite hurt={flash === 'player'} />
          <div className="nameplate">
            <span className="cname">{player.name}</span>
            <span className="ctag">combat {player.combatLevel}</span>
          </div>
          <HealthBar hp={player.hp} maxHp={player.maxHp} align="left" />
        </div>
      </div>

      <div className="controls">
        {over ? (
          <div className="outcome">
            <div className={`outcome-banner ${status}`}>
              {status === 'won' ? 'Victory!' : 'Defeated'}
            </div>
            <button className="btn primary" onClick={onReset}>
              New fight
            </button>
          </div>
        ) : (
          <div className="attacks">
            {Object.values(player.styles).map((s) => (
              <button key={s.key} className={`btn attack ${s.key}`} onClick={() => onAttack(s.key)}>
                <span className="atk-label">{s.label}</span>
                <span className="atk-meta">
                  {s.key} · lvl {s.level} · max {s.maxHit}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <CombatLog log={battle.log} />
    </div>
  );
}
