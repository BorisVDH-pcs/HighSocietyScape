export default function HealthBar({ hp, maxHp, align = 'left' }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const tone = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'low';
  return (
    <div className={`hpbar ${align}`}>
      <div className="hpbar-track">
        <div className={`hpbar-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="hpbar-num">
        {hp} / {maxHp}
      </div>
    </div>
  );
}
