// Cross-team leaderboard overlay (app-level, all teams). Opened from the header
// 🏆 button. `rows` is the ranked list from game/leaderboard.js, or null while
// loading. `currentTeam` highlights the team you're playing.

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard({ rows, currentTeam, onClose }) {
  return (
    <div className="lb-overlay" role="dialog" aria-label="Season rankings" onClick={onClose}>
      <div className="lb-card" onClick={(e) => e.stopPropagation()}>
        <div className="lb-head">
          <span>🏆 SEASON RANKINGS</span>
          <button className="lb-x" onClick={onClose} aria-label="Close rankings">
            ✕
          </button>
        </div>

        {rows == null ? (
          <div className="lb-loading">Loading standings…</div>
        ) : (
          <div className="lb-table">
            <div className="lb-row lb-colhead">
              <span className="lb-rank">#</span>
              <span className="lb-team">TEAM</span>
              <span className="lb-boss">FURTHEST</span>
              <span className="lb-num">KILLS</span>
              <span className="lb-num">CMB</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.team}
                className={`lb-row ${r.team === currentTeam ? 'me' : ''} ${r.rank <= 3 ? 'top' : ''}`}
              >
                <span className="lb-rank">{MEDALS[r.rank] ?? r.rank}</span>
                <span className="lb-team">{r.team}</span>
                <span className="lb-boss">{r.furthestBoss}</span>
                <span className="lb-num">{r.kills}</span>
                <span className="lb-num">{r.combatLevel}</span>
              </div>
            ))}
          </div>
        )}

        <div className="lb-foot">Ranked by furthest boss, then total kills, then combat level.</div>
      </div>
    </div>
  );
}
