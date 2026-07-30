// Original 2D sprites — no ripped Jagex/Pokémon art (see CLAUDE.md). All are
// hand-drawn SVG in an OSRS-flavoured chibi style (big head, chunky gear). The
// hero changes with the equipped gear: Warrior in bronze/steel plate (melee),
// Archer in a green ranger hood + leather (ranged), Mage in a blue wizard robe
// (magic). The Goblin boss has its own earthy green palette. `hurt` flashes the
// sprite on damage.

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
const WOOD = '#6b4a2b';      // wooden shaft (spear / bow / staff)

// Hero palette — OSRS-style gear.
const SKIN = '#e3b184';      // face
const SKIN_DK = '#c68e60';   // face shadow
const STEEL = '#8f96a3';     // plate metal
const STEEL_DK = '#575d69';  // metal shadow / visor
const STEEL_LT = '#c4cad4';  // metal highlight / blade
const BRONZE = '#c98a3a';    // armour trim (ties into the gold theme)
const LEATHER = '#8a5a2f';   // ranger leather
const LEATHER_DK = '#5d3a1b';
const RANGER = '#4d6b34';    // Lincoln-green hood/tunic
const RANGER_DK = '#33481f';
const ROBE = '#3c5b8c';      // wizard blue
const ROBE_DK = '#274069';
const ROBE_LT = '#5f7fb4';
const GEM = '#67d3e6';       // staff orb

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
      {/* ground shadow */}
      <ellipse cx="60" cy="133" rx="30" ry="5" fill={INK} opacity="0.25" stroke="none" />

      {/* plate legs + boots */}
      <rect x="47" y="108" width="9" height="18" rx="2" fill={STEEL} />
      <rect x="64" y="108" width="9" height="18" rx="2" fill={STEEL} />
      <path d="M43 128 Q52 122 59 127 L58 122 L45 122 Z" fill={STEEL_DK} />
      <path d="M61 127 Q68 122 77 128 L75 122 L62 122 Z" fill={STEEL_DK} />

      {/* platebody + shoulder pauldrons */}
      <path d="M34 80 Q60 72 86 80 L90 114 Q60 122 30 114 Z" fill={STEEL} />
      <path d="M30 108 Q60 116 90 108 L90 114 Q60 122 30 114 Z" fill={STEEL_DK} stroke="none" />
      <ellipse cx="37" cy="82" rx="12" ry="9" fill={STEEL_LT} />
      <ellipse cx="83" cy="82" rx="12" ry="9" fill={STEEL_LT} />
      <path d="M60 76 L60 116" stroke={STEEL_DK} strokeWidth="2.5" />
      <path d="M42 92 Q60 98 78 92" stroke={BRONZE} strokeWidth="3" fill="none" />

      {/* heater shield (left arm), bronze rim + cross */}
      <path d="M10 82 L34 82 L34 104 Q22 120 10 104 Z" fill={STEEL_DK} />
      <path d="M10 82 L34 82 L34 104 Q22 120 10 104 Z" fill="none" stroke={BRONZE} strokeWidth="2.5" />
      <path d="M22 86 L22 110 M14 96 L30 96" stroke={BRONZE} strokeWidth="2.5" />

      {/* raised sword (right hand): steel blade, bronze guard */}
      <rect x="95" y="18" width="7" height="64" rx="2" fill={STEEL_LT} transform="rotate(9 98 50)" />
      <path d="M96 18 L102 18 L99 12 Z" fill={STEEL_LT} transform="rotate(9 98 50)" />
      <rect x="88" y="82" width="22" height="6" rx="1.5" fill={BRONZE} transform="rotate(9 98 50)" />
      <rect x="96" y="88" width="6" height="14" rx="1.5" fill={LEATHER} transform="rotate(9 98 50)" />
      <ellipse cx="90" cy="96" rx="7" ry="6" fill={STEEL} />

      {/* full helm: steel dome, bronze brow, dark T-slot visor */}
      <path d="M32 46 Q32 16 60 16 Q88 16 88 46 L88 58 Q60 66 32 58 Z" fill={STEEL} />
      <path d="M32 44 Q60 34 88 44 L88 50 Q60 42 32 50 Z" fill={BRONZE} stroke="none" />
      <rect x="56" y="46" width="8" height="18" rx="1" fill={STEEL_DK} stroke="none" />
      <rect x="42" y="48" width="14" height="6" rx="1" fill={STEEL_DK} stroke="none" />
      <rect x="64" y="48" width="14" height="6" rx="1" fill={STEEL_DK} stroke="none" />
      {/* red plume */}
      <path d="M60 16 Q60 4 68 2 Q64 8 66 16 Z" fill={TUNIC} />
    </svg>
  );
}

function Archer({ hurt }) {
  return (
    <svg {...svgProps('hero', hurt, 'Archer')}>
      {/* ground shadow */}
      <ellipse cx="60" cy="133" rx="28" ry="5" fill={INK} opacity="0.25" stroke="none" />

      {/* legs + boots */}
      <rect x="49" y="110" width="8" height="16" rx="2" fill={LEATHER_DK} />
      <rect x="63" y="110" width="8" height="16" rx="2" fill={LEATHER_DK} />
      <path d="M44 127 Q52 122 60 126 L59 121 L46 121 Z" fill={INK} />
      <path d="M60 126 Q68 122 76 127 L74 121 L61 121 Z" fill={INK} />

      {/* arrows in a back quiver (fletchings over the shoulder) */}
      <line x1="30" y1="74" x2="24" y2="52" stroke={WOOD} strokeWidth="2.5" />
      <line x1="36" y1="74" x2="32" y2="52" stroke={WOOD} strokeWidth="2.5" />
      <path d="M24 52 L20 56 M24 52 L28 55 M32 52 L28 56 M32 52 L36 55" stroke={RANGER_DK} strokeWidth="2" />

      {/* leather body + green tunic + strap */}
      <path d="M36 80 Q60 72 84 80 L88 116 Q60 124 32 116 Z" fill={LEATHER} />
      <path d="M44 78 Q60 72 76 78 L78 96 Q60 102 42 96 Z" fill={RANGER} stroke="none" />
      <path d="M40 84 L80 108" stroke={LEATHER_DK} strokeWidth="4" />
      <path d="M32 112 Q60 118 88 112 L88 116 Q60 124 32 116 Z" fill={LEATHER_DK} stroke="none" />

      {/* green hood framing the face */}
      <path d="M30 62 Q22 14 60 12 Q98 14 90 62 Q80 30 60 30 Q40 30 30 62 Z" fill={RANGER} />
      <path d="M34 60 Q28 24 60 22 Q92 24 86 60 Q78 34 60 34 Q42 34 34 60 Z" fill={RANGER_DK} stroke="none" />
      <circle cx="60" cy="46" r="20" fill={SKIN} />
      <path d="M40 46 Q40 26 60 26 Q80 26 80 46 Q72 32 60 32 Q48 32 40 46 Z" fill={RANGER} stroke="none" />
      <circle cx="53" cy="47" r="3" fill={INK} stroke="none" />
      <circle cx="67" cy="47" r="3" fill={INK} stroke="none" />
      <path d="M54 58 Q60 61 66 58" stroke={SKIN_DK} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* recurve bow + nocked arrow aimed at the enemy (upper-right) */}
      <path d="M96 16 Q120 62 96 112" fill="none" stroke={WOOD} strokeWidth="5" />
      <line x1="96" y1="16" x2="96" y2="112" stroke={LIGHT} strokeWidth="1.5" />
      <line x1="60" y1="64" x2="104" y2="64" stroke={WOOD} strokeWidth="2.5" />
      <path d="M104 64 L96 60 M104 64 L96 68" fill="none" stroke={STEEL_DK} strokeWidth="2.5" />
      <ellipse cx="60" cy="64" rx="6" ry="5" fill={SKIN} />
    </svg>
  );
}

function Mage({ hurt }) {
  return (
    <svg {...svgProps('hero', hurt, 'Mage')}>
      {/* ground shadow */}
      <ellipse cx="60" cy="134" rx="30" ry="5" fill={INK} opacity="0.25" stroke="none" />

      {/* long robe to the floor + trim + sash */}
      <path d="M34 88 Q60 80 86 88 L98 128 Q60 136 22 128 Z" fill={ROBE} />
      <path d="M34 88 Q60 80 86 88 L88 100 Q60 108 32 100 Z" fill={ROBE_DK} stroke="none" />
      <path d="M60 84 L60 130" stroke={ROBE_LT} strokeWidth="3" />
      <path d="M40 116 Q60 124 80 116" stroke={BRONZE} strokeWidth="3" fill="none" />
      {/* sleeves */}
      <ellipse cx="34" cy="96" rx="9" ry="11" fill={ROBE} transform="rotate(18 34 96)" />
      <ellipse cx="86" cy="96" rx="9" ry="11" fill={ROBE} transform="rotate(-18 86 96)" />

      {/* face + white beard */}
      <circle cx="60" cy="50" r="20" fill={SKIN} />
      <circle cx="53" cy="50" r="3" fill={INK} stroke="none" />
      <circle cx="67" cy="50" r="3" fill={INK} stroke="none" />
      <path d="M44 56 Q60 92 76 56 Q60 66 44 56 Z" fill={PAPER} />

      {/* pointy wizard hat with a gold star */}
      <ellipse cx="60" cy="36" rx="30" ry="7" fill={ROBE} />
      <path d="M60 -6 Q56 22 40 36 L80 36 Q64 22 60 -6 Z" fill={ROBE} />
      <path d="M60 -6 Q58 22 50 36 L60 36 Z" fill={ROBE_DK} stroke="none" />
      <path d="M58 6 L61 12 L67 12 L62 16 L64 22 L58 18 L52 22 L54 16 L49 12 L55 12 Z" fill={BRONZE} stroke="none" />

      {/* staff with a glowing orb */}
      <rect x="96" y="40" width="5" height="86" rx="2" fill={WOOD} transform="rotate(7 98 83)" />
      <circle cx="102" cy="34" r="11" fill={GEM} />
      <circle cx="99" cy="31" r="3.5" fill={PAPER} stroke="none" />
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
