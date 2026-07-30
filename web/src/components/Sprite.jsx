// Original 2D sprites — no ripped Jagex/Pokémon art (see CLAUDE.md). The heroes
// stay in 4-shade Game Boy grayscale and change with the equipped gear: Warrior
// (melee), Archer (ranged), Mage (magic). The Goblin boss gets its own earthy
// palette (green skin, crude tunic, amber eyes) so it reads clearly as a goblin
// — an original silhouette evoking the classic look, not a copied asset.
// `hurt` flashes the sprite on damage.

const INK = '#0f0f0f';
const DARK = '#565656';
const LIGHT = '#a2a2a2';
const PAPER = '#e8e8dc';

// Goblin-only palette (kept muted/earthy to sit on the warm parchment screen).
const GOB = '#7f9b45';       // olive-green skin
const GOB_DK = '#5c7530';    // skin shadow
const GOB_LT = '#a3c066';    // skin highlight
const TUNIC = '#8a4a2c';     // crude rusty tunic
const TUNIC_DK = '#5d3019';  // tunic shadow / belt
const EYE = '#f2c14e';       // amber eye (ties into the gold theme)
const WOOD = '#6b4a2b';      // spear shaft

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
      {/* ground shadow */}
      <ellipse cx="60" cy="133" rx="30" ry="5" fill={INK} opacity="0.25" stroke="none" />

      {/* crude spear behind the body */}
      <rect x="94" y="20" width="5" height="106" rx="2.5" fill={WOOD} transform="rotate(7 96 73)" />
      <path d="M101 14 L109 30 L98 32 Z" fill={LIGHT} transform="rotate(7 96 73)" />

      {/* spindly legs + splayed feet */}
      <rect x="47" y="112" width="8" height="16" rx="3" fill={GOB} />
      <rect x="65" y="112" width="8" height="16" rx="3" fill={GOB} />
      <path d="M40 128 Q48 122 58 127 Q50 132 42 130 Z" fill={GOB_DK} />
      <path d="M62 127 Q72 122 80 128 Q70 132 62 130 Z" fill={GOB_DK} />

      {/* potbellied torso in a crude tunic */}
      <path d="M40 78 Q60 70 80 78 L88 116 Q60 126 32 116 Z" fill={TUNIC} />
      <path d="M32 108 Q60 116 88 108 L86 116 Q60 124 34 116 Z" fill={TUNIC_DK} stroke="none" />
      <rect x="34" y="104" width="52" height="7" rx="1" fill={TUNIC_DK} />
      {/* green chest showing at the neckline */}
      <path d="M50 74 Q60 84 70 74 Q60 82 50 74 Z" fill={GOB_DK} stroke="none" />

      {/* spindly arms — left hangs, right grips the spear */}
      <path d="M40 82 Q26 96 30 112 L36 110 Q34 96 46 86 Z" fill={GOB} />
      <ellipse cx="31" cy="112" rx="6" ry="5" fill={GOB} />
      <path d="M80 82 Q94 78 96 66 L90 64 Q88 76 74 86 Z" fill={GOB} />
      <ellipse cx="93" cy="66" rx="6" ry="5.5" fill={GOB} />

      {/* big pointed ears, angled up and out */}
      <path d="M33 42 Q6 22 9 48 Q16 54 36 52 Z" fill={GOB} />
      <path d="M87 42 Q114 22 111 48 Q104 54 84 52 Z" fill={GOB} />
      <path d="M30 44 Q16 36 15 47 Q22 49 32 49 Z" fill={GOB_DK} stroke="none" />
      <path d="M90 44 Q104 36 105 47 Q98 49 88 49 Z" fill={GOB_DK} stroke="none" />

      {/* oversized head with a pointed chin */}
      <path d="M31 46 Q31 18 60 18 Q89 18 89 46 Q89 68 60 82 Q31 68 31 46 Z" fill={GOB} />
      {/* heavy angry brow ridge */}
      <path d="M34 44 Q47 34 57 42 L54 49 Q46 43 38 47 Z" fill={GOB_DK} stroke="none" />
      <path d="M86 44 Q73 34 63 42 L66 49 Q74 43 82 47 Z" fill={GOB_DK} stroke="none" />

      {/* beady amber eyes, angled mean */}
      <ellipse cx="48" cy="52" rx="7" ry="5" fill={EYE} transform="rotate(14 48 52)" />
      <ellipse cx="72" cy="52" rx="7" ry="5" fill={EYE} transform="rotate(-14 72 52)" />
      <circle cx="50" cy="52" r="2.8" fill={INK} stroke="none" />
      <circle cx="70" cy="52" r="2.8" fill={INK} stroke="none" />

      {/* big bulbous nose hanging toward the mouth */}
      <path d="M55 50 Q60 46 65 50 Q70 66 60 72 Q50 66 55 50 Z" fill={GOB_LT} />
      <circle cx="56" cy="65" r="1.6" fill={GOB_DK} stroke="none" />
      <circle cx="64" cy="65" r="1.6" fill={GOB_DK} stroke="none" />

      {/* wide grimace with an underbite — fangs pointing up */}
      <path d="M44 74 Q60 82 76 74" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 76 L53 69 L57 76 Z" fill={PAPER} />
      <path d="M63 76 L67 69 L70 76 Z" fill={PAPER} />
    </svg>
  );
}
