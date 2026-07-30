// Original 2D sprites — no ripped Jagex/Pokémon art (see CLAUDE.md). Recolored
// into a 4-shade Game Boy grayscale. The hero changes with the equipped gear:
// Warrior (melee), Archer (ranged), Mage (magic). `hurt` flashes on damage.

const INK = '#0f0f0f';
const DARK = '#565656';
const LIGHT = '#a2a2a2';
const PAPER = '#e8e8dc';

const svgProps = (kind, hurt, label) => ({
  viewBox: '0 0 120 140',
  className: `sprite ${kind} ${hurt ? 'hurt' : ''}`,
  'aria-label': label,
  stroke: INK,
  strokeWidth: 2.5,
  strokeLinejoin: 'round',
});

function Warrior({ hurt }) {
  return (
    <svg {...svgProps('hero', hurt, 'Warrior')}>
      <path d="M35 70 Q60 60 85 70 L92 128 Q60 138 28 128 Z" fill={DARK} />
      <path d="M35 70 Q60 60 85 70 L88 92 Q60 100 32 92 Z" fill={INK} stroke="none" />
      <circle cx="60" cy="42" r="24" fill={PAPER} />
      {/* helmet */}
      <path d="M34 44 Q34 14 60 14 Q86 14 86 44 L78 44 Q78 26 60 26 Q42 26 42 44 Z" fill={LIGHT} />
      <rect x="57" y="18" width="6" height="20" fill={PAPER} />
      <circle cx="52" cy="44" r="3" fill={INK} stroke="none" />
      <circle cx="68" cy="44" r="3" fill={INK} stroke="none" />
      {/* sword + shield */}
      <rect x="96" y="30" width="6" height="70" rx="1" fill={LIGHT} transform="rotate(12 99 65)" />
      <rect x="88" y="92" width="22" height="6" rx="1" fill={DARK} />
      <path d="M14 74 Q26 70 30 74 L30 104 Q22 116 14 104 Z" fill={LIGHT} />
      <path d="M18 80 L26 80 M22 78 L22 100" stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

function Archer({ hurt }) {
  return (
    <svg {...svgProps('hero', hurt, 'Archer')}>
      <path d="M35 70 Q60 60 85 70 L92 128 Q60 138 28 128 Z" fill={DARK} />
      <path d="M35 70 Q60 60 85 70 L88 96 Q60 104 32 96 Z" fill={INK} stroke="none" />
      {/* hood behind head */}
      <path d="M30 64 Q24 14 60 12 Q96 14 90 64 Q82 30 60 30 Q38 30 30 64 Z" fill={LIGHT} />
      <circle cx="60" cy="44" r="21" fill={PAPER} />
      <circle cx="53" cy="46" r="3" fill={INK} stroke="none" />
      <circle cx="67" cy="46" r="3" fill={INK} stroke="none" />
      {/* bow + nocked arrow */}
      <path d="M98 14 Q118 60 98 114" fill="none" stroke={INK} strokeWidth="4" />
      <line x1="98" y1="14" x2="98" y2="114" stroke={INK} strokeWidth="1.5" />
      <line x1="58" y1="64" x2="106" y2="64" stroke={INK} strokeWidth="2.5" />
      <path d="M106 64 L98 60 M106 64 L98 68" fill="none" stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

function Mage({ hurt }) {
  return (
    <svg {...svgProps('hero', hurt, 'Mage')}>
      {/* robe */}
      <path d="M30 66 Q60 58 90 66 L100 134 Q60 142 20 134 Z" fill={DARK} />
      <path d="M44 70 Q60 64 76 70 L80 122 Q60 128 40 122 Z" fill={INK} stroke="none" />
      <circle cx="60" cy="46" r="20" fill={PAPER} />
      {/* wizard hat */}
      <ellipse cx="60" cy="34" rx="30" ry="7" fill={LIGHT} />
      <path d="M60 -6 L82 34 L38 34 Z" fill={LIGHT} />
      <circle cx="53" cy="48" r="3" fill={INK} stroke="none" />
      <circle cx="67" cy="48" r="3" fill={INK} stroke="none" />
      {/* staff + orb */}
      <rect x="95" y="42" width="5" height="84" rx="1" fill={DARK} transform="rotate(6 97 84)" />
      <circle cx="99" cy="34" r="10" fill={PAPER} />
      <circle cx="99" cy="34" r="4" fill={LIGHT} stroke="none" />
    </svg>
  );
}

/** Pick the hero sprite for the equipped combat style. */
export function Hero({ style, hurt }) {
  if (style === 'ranged') return <Archer hurt={hurt} />;
  if (style === 'magic') return <Mage hurt={hurt} />;
  return <Warrior hurt={hurt} />;
}

export function GoblinSprite({ hurt }) {
  return (
    <svg {...svgProps('goblin', hurt, 'Goblin')}>
      <ellipse cx="60" cy="98" rx="34" ry="32" fill={DARK} />
      <ellipse cx="60" cy="104" rx="22" ry="18" fill={INK} stroke="none" />
      <ellipse cx="60" cy="52" rx="30" ry="26" fill={LIGHT} />
      <path d="M30 50 Q6 40 14 62 Q26 60 34 60 Z" fill={LIGHT} />
      <path d="M90 50 Q114 40 106 62 Q94 60 86 60 Z" fill={LIGHT} />
      <ellipse cx="49" cy="50" rx="7" ry="8" fill={PAPER} />
      <ellipse cx="71" cy="50" rx="7" ry="8" fill={PAPER} />
      <circle cx="49" cy="52" r="3.2" fill={INK} stroke="none" />
      <circle cx="71" cy="52" r="3.2" fill={INK} stroke="none" />
      <path d="M40 40 L57 46 M80 40 L63 46" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M46 64 Q60 74 74 64" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M52 66 L55 72 L58 66 Z" fill={PAPER} />
      <path d="M62 66 L65 72 L68 66 Z" fill={PAPER} />
      <rect x="86" y="72" width="8" height="44" rx="2" fill={DARK} transform="rotate(18 90 94)" />
      <circle cx="98" cy="70" r="12" fill={LIGHT} />
    </svg>
  );
}
