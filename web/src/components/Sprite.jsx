// Original 2D SVG sprites — no ripped Jagex/OSRS art (see CLAUDE.md).
// `hurt` briefly flashes the sprite when it takes damage.

export function HeroSprite({ hurt }) {
  return (
    <svg viewBox="0 0 120 140" className={`sprite hero ${hurt ? 'hurt' : ''}`} aria-label="Hero">
      {/* body / tunic */}
      <path d="M35 70 Q60 60 85 70 L92 128 Q60 138 28 128 Z" fill="#3b82f6" />
      <path d="M35 70 Q60 60 85 70 L88 92 Q60 100 32 92 Z" fill="#2563eb" />
      {/* head */}
      <circle cx="60" cy="42" r="24" fill="#f2c9a0" />
      {/* helmet */}
      <path d="M34 44 Q34 14 60 14 Q86 14 86 44 L78 44 Q78 26 60 26 Q42 26 42 44 Z" fill="#94a3b8" />
      <rect x="57" y="18" width="6" height="20" fill="#cbd5e1" />
      {/* eyes */}
      <circle cx="52" cy="44" r="3" fill="#1e293b" />
      <circle cx="68" cy="44" r="3" fill="#1e293b" />
      {/* sword */}
      <rect x="96" y="30" width="6" height="70" rx="2" fill="#e2e8f0" transform="rotate(12 99 65)" />
      <rect x="88" y="92" width="22" height="6" rx="2" fill="#64748b" />
      {/* shield */}
      <path d="M14 74 Q26 70 30 74 L30 104 Q22 116 14 104 Z" fill="#eab308" />
      <path d="M18 80 L26 80 M22 78 L22 100" stroke="#a16207" strokeWidth="2.5" />
    </svg>
  );
}

export function GoblinSprite({ hurt }) {
  return (
    <svg viewBox="0 0 120 140" className={`sprite goblin ${hurt ? 'hurt' : ''}`} aria-label="Goblin">
      {/* body */}
      <ellipse cx="60" cy="98" rx="34" ry="32" fill="#4d7c0f" />
      <ellipse cx="60" cy="104" rx="22" ry="18" fill="#3f6212" />
      {/* head */}
      <ellipse cx="60" cy="52" rx="30" ry="26" fill="#65a30d" />
      {/* ears */}
      <path d="M30 50 Q6 40 14 62 Q26 60 34 60 Z" fill="#65a30d" />
      <path d="M90 50 Q114 40 106 62 Q94 60 86 60 Z" fill="#65a30d" />
      {/* eyes */}
      <ellipse cx="49" cy="50" rx="7" ry="8" fill="#fef9c3" />
      <ellipse cx="71" cy="50" rx="7" ry="8" fill="#fef9c3" />
      <circle cx="49" cy="52" r="3.2" fill="#7f1d1d" />
      <circle cx="71" cy="52" r="3.2" fill="#7f1d1d" />
      {/* brow */}
      <path d="M40 40 L57 46 M80 40 L63 46" stroke="#3f6212" strokeWidth="3" strokeLinecap="round" />
      {/* mouth + teeth */}
      <path d="M46 64 Q60 74 74 64" stroke="#1a2e05" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M52 66 L55 72 L58 66 Z" fill="#fef9c3" />
      <path d="M62 66 L65 72 L68 66 Z" fill="#fef9c3" />
      {/* club */}
      <rect x="86" y="72" width="8" height="44" rx="3" fill="#78350f" transform="rotate(18 90 94)" />
      <circle cx="98" cy="70" r="12" fill="#92400e" />
    </svg>
  );
}
