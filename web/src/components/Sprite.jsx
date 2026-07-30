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

// Boss-ladder palettes (each boss reads distinct on the warm parchment screen).
const RAT = '#8a7a63';       // giant rat fur
const RAT_DK = '#5f5343';    // fur shadow
const RAT_LT = '#a8987e';    // fur highlight
const FLESH = '#d98c8c';     // ears / nose / tail (pinkish)
const BONE = '#e9e7d6';      // skeleton bone
const BONE_DK = '#b0ad97';   // bone shadow
const HOB = '#6f7f3c';       // hobgoblin skin (darker, muddier than the goblin)
const HOB_DK = '#4c5827';
const HOB_LT = '#93a457';
const HIDE = '#6d4a2a';      // hobgoblin hide loincloth / club grip
const DEMON = '#b0402e';     // demon skin
const DEMON_DK = '#7a2418';  // demon shadow / wing membrane
const DEMON_LT = '#d76a51';  // demon highlight
const HORN = '#d9cdb0';      // demon horns / claws (bone)
const FLAME = '#f2913a';     // demonfire / glowing eyes

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

function GiantRatSprite({ hurt }) {
  return (
    <svg {...svgProps('rat', hurt, 'Giant Rat')}>
      {/* ground shadow */}
      <ellipse cx="60" cy="133" rx="34" ry="5" fill={INK} opacity="0.25" stroke="none" />

      {/* long curling tail sweeping out behind */}
      <path
        d="M86 118 Q112 116 112 96 Q112 82 100 84"
        fill="none"
        stroke={FLESH}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* haunches / body — hunched on its back legs */}
      <path d="M30 96 Q60 82 90 96 L92 118 Q60 130 28 118 Z" fill={RAT} />
      <path d="M28 112 Q60 122 92 112 L92 118 Q60 130 28 118 Z" fill={RAT_DK} stroke="none" />
      <ellipse cx="44" cy="102" rx="12" ry="10" fill={RAT_LT} stroke="none" />

      {/* hind feet + small front paws */}
      <path d="M34 126 Q42 120 50 125 Q42 130 34 128 Z" fill={FLESH} />
      <path d="M70 125 Q78 120 86 126 Q78 130 70 128 Z" fill={FLESH} />
      <ellipse cx="52" cy="112" rx="6" ry="5" fill={RAT_LT} />
      <ellipse cx="68" cy="112" rx="6" ry="5" fill={RAT_LT} />

      {/* big round ears */}
      <circle cx="38" cy="40" r="15" fill={RAT} />
      <circle cx="82" cy="40" r="15" fill={RAT} />
      <circle cx="38" cy="40" r="8" fill={FLESH} stroke="none" />
      <circle cx="82" cy="40" r="8" fill={FLESH} stroke="none" />

      {/* oversized head, tapering to a snout */}
      <path d="M34 56 Q34 30 60 30 Q86 30 86 56 Q86 74 60 84 Q34 74 34 56 Z" fill={RAT} />
      <path d="M52 70 Q60 66 68 70 Q70 84 60 90 Q50 84 52 70 Z" fill={RAT_LT} />
      <ellipse cx="60" cy="86" rx="5" ry="4" fill={FLESH} stroke="none" />

      {/* beady eyes */}
      <circle cx="50" cy="54" r="4" fill={INK} stroke="none" />
      <circle cx="70" cy="54" r="4" fill={INK} stroke="none" />
      <circle cx="51" cy="53" r="1.3" fill={PAPER} stroke="none" />
      <circle cx="71" cy="53" r="1.3" fill={PAPER} stroke="none" />

      {/* whiskers */}
      <path d="M56 82 Q40 82 30 76 M56 86 Q42 88 32 88" stroke={INK} strokeWidth="1.5" fill="none" />
      <path d="M64 82 Q80 82 90 76 M64 86 Q78 88 88 88" stroke={INK} strokeWidth="1.5" fill="none" />

      {/* buck teeth */}
      <rect x="56" y="88" width="3.5" height="8" rx="1" fill={PAPER} />
      <rect x="60.5" y="88" width="3.5" height="8" rx="1" fill={PAPER} />
    </svg>
  );
}

function SkeletonSprite({ hurt }) {
  return (
    <svg {...svgProps('skeleton', hurt, 'Skeleton')}>
      {/* ground shadow */}
      <ellipse cx="60" cy="133" rx="28" ry="5" fill={INK} opacity="0.25" stroke="none" />

      {/* leg bones + foot bones */}
      <rect x="50" y="104" width="7" height="24" rx="3" fill={BONE} />
      <rect x="63" y="104" width="7" height="24" rx="3" fill={BONE} />
      <path d="M46 128 L58 128 L58 124 L48 124 Z" fill={BONE_DK} />
      <path d="M62 128 L74 128 L72 124 L62 124 Z" fill={BONE_DK} />

      {/* pelvis */}
      <path d="M46 96 Q60 104 74 96 L72 108 Q60 112 48 108 Z" fill={BONE} />
      <path d="M60 100 L60 110" stroke={BONE_DK} strokeWidth="2" />

      {/* spine + ribcage */}
      <rect x="57" y="60" width="6" height="40" rx="2" fill={BONE} />
      <path d="M60 66 Q40 68 42 78 Q54 78 60 76 Z" fill={BONE} />
      <path d="M60 66 Q80 68 78 78 Q66 78 60 76 Z" fill={BONE} />
      <path d="M60 78 Q42 80 45 90 Q55 89 60 87 Z" fill={BONE} />
      <path d="M60 78 Q78 80 75 90 Q65 89 60 87 Z" fill={BONE} />

      {/* arm bones — one hanging, one raised with a bony claw */}
      <rect x="30" y="62" width="6" height="34" rx="3" fill={BONE} transform="rotate(12 33 79)" />
      <path d="M26 96 l-4 6 m4 -6 l3 6 m-3 -6 l-1 7" stroke={BONE} strokeWidth="3" strokeLinecap="round" />
      <rect x="84" y="58" width="6" height="30" rx="3" fill={BONE} transform="rotate(-16 87 73)" />
      <path d="M92 50 l6 -3 m-6 3 l5 4 m-5 -4 l1 6" stroke={BONE} strokeWidth="3" strokeLinecap="round" />

      {/* shoulders */}
      <circle cx="40" cy="60" r="6" fill={BONE} />
      <circle cx="80" cy="60" r="6" fill={BONE} />

      {/* skull */}
      <path d="M40 40 Q40 16 60 16 Q80 16 80 40 Q80 50 74 54 L46 54 Q40 50 40 40 Z" fill={BONE} />
      <path d="M52 54 L52 62 Q60 66 68 62 L68 54 Z" fill={BONE} />
      {/* eye sockets + nasal cavity */}
      <ellipse cx="51" cy="38" rx="6" ry="7" fill={INK} stroke="none" />
      <ellipse cx="69" cy="38" rx="6" ry="7" fill={INK} stroke="none" />
      <path d="M60 44 L56 52 L64 52 Z" fill={INK} stroke="none" />
      {/* gritted teeth */}
      <path d="M50 56 L70 56" stroke={INK} strokeWidth="2" />
      <path d="M54 54 L54 58 M58 54 L58 58 M62 54 L62 58 M66 54 L66 58" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}

function HobgoblinSprite({ hurt }) {
  return (
    <svg {...svgProps('hobgoblin', hurt, 'Hobgoblin')}>
      {/* ground shadow */}
      <ellipse cx="60" cy="134" rx="34" ry="5" fill={INK} opacity="0.25" stroke="none" />

      {/* big wooden club resting on the shoulder */}
      <rect x="86" y="34" width="10" height="70" rx="5" fill={HIDE} transform="rotate(18 91 69)" />
      <path d="M92 26 Q108 28 106 44 Q98 50 86 44 Q84 30 92 26 Z" fill={WOOD} transform="rotate(18 91 69)" />
      <circle cx="98" cy="34" r="2" fill={INK} stroke="none" transform="rotate(18 91 69)" />
      <circle cx="103" cy="40" r="2" fill={INK} stroke="none" transform="rotate(18 91 69)" />

      {/* thick legs + feet */}
      <rect x="44" y="110" width="12" height="18" rx="3" fill={HOB} />
      <rect x="64" y="110" width="12" height="18" rx="3" fill={HOB} />
      <path d="M38 128 Q48 122 58 128 Q48 132 38 130 Z" fill={HOB_DK} />
      <path d="M62 128 Q72 122 82 128 Q72 132 62 130 Z" fill={HOB_DK} />

      {/* broad, muscular torso + hide loincloth */}
      <path d="M32 74 Q60 64 88 74 L92 112 Q60 122 28 112 Z" fill={HOB} />
      <ellipse cx="42" cy="80" rx="12" ry="10" fill={HOB_LT} stroke="none" />
      <ellipse cx="78" cy="80" rx="12" ry="10" fill={HOB_LT} stroke="none" />
      <path d="M36 104 Q60 112 84 104 L80 120 Q60 126 40 120 Z" fill={HIDE} />

      {/* left arm hanging, fist clenched */}
      <path d="M32 78 Q18 92 22 110 L30 108 Q26 92 40 82 Z" fill={HOB} />
      <circle cx="26" cy="110" r="7" fill={HOB} />

      {/* right arm gripping the club */}
      <path d="M84 80 Q96 76 98 68 L92 62 Q88 74 76 82 Z" fill={HOB} />

      {/* oversized head, low heavy brow */}
      <path d="M34 50 Q34 24 60 24 Q86 24 86 50 Q86 70 60 82 Q34 70 34 50 Z" fill={HOB} />
      <path d="M30 40 Q22 30 16 38 Q22 46 34 48 Z" fill={HOB} />
      <path d="M90 40 Q98 30 104 38 Q98 46 86 48 Z" fill={HOB} />
      {/* warpaint stripes */}
      <path d="M44 30 L48 40 M76 30 L72 40" stroke={HOB_DK} strokeWidth="3" strokeLinecap="round" />
      {/* heavy brow */}
      <path d="M36 48 Q50 40 58 47 L55 54 Q48 48 40 51 Z" fill={HOB_DK} stroke="none" />
      <path d="M84 48 Q70 40 62 47 L65 54 Q72 48 80 51 Z" fill={HOB_DK} stroke="none" />
      {/* eyes */}
      <ellipse cx="49" cy="55" rx="7" ry="5" fill={EYE} transform="rotate(12 49 55)" />
      <ellipse cx="71" cy="55" rx="7" ry="5" fill={EYE} transform="rotate(-12 71 55)" />
      <circle cx="51" cy="55" r="2.6" fill={INK} stroke="none" />
      <circle cx="69" cy="55" r="2.6" fill={INK} stroke="none" />
      {/* snarl + jutting tusks */}
      <path d="M44 70 Q60 78 76 70" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M48 72 L45 63 L53 71 Z" fill={PAPER} />
      <path d="M72 72 L75 63 L67 71 Z" fill={PAPER} />
    </svg>
  );
}

function LesserDemonSprite({ hurt }) {
  return (
    <svg {...svgProps('demon', hurt, 'Lesser Demon')}>
      {/* ground shadow + demonfire glow */}
      <ellipse cx="60" cy="134" rx="36" ry="6" fill={INK} opacity="0.25" stroke="none" />
      <ellipse cx="60" cy="132" rx="26" ry="4" fill={FLAME} opacity="0.4" stroke="none" />

      {/* leathery wings spread behind */}
      <path d="M34 74 Q4 52 6 88 Q10 96 22 92 Q14 100 26 104 L38 92 Z" fill={DEMON_DK} />
      <path d="M86 74 Q116 52 114 88 Q110 96 98 92 Q106 100 94 104 L82 92 Z" fill={DEMON_DK} />
      <path d="M14 66 L20 86 M24 72 L28 92" stroke={DEMON} strokeWidth="2" fill="none" />
      <path d="M106 66 L100 86 M96 72 L92 92" stroke={DEMON} strokeWidth="2" fill="none" />

      {/* legs + clawed feet */}
      <rect x="46" y="110" width="11" height="18" rx="3" fill={DEMON} />
      <rect x="63" y="110" width="11" height="18" rx="3" fill={DEMON} />
      <path d="M42 128 l4 -4 l3 4 l3 -4 l3 4 Z" fill={HORN} stroke="none" />
      <path d="M62 128 l4 -4 l3 4 l3 -4 l3 4 Z" fill={HORN} stroke="none" />

      {/* broad torso */}
      <path d="M34 72 Q60 62 86 72 L90 112 Q60 122 30 112 Z" fill={DEMON} />
      <ellipse cx="44" cy="80" rx="12" ry="10" fill={DEMON_LT} stroke="none" />
      <ellipse cx="76" cy="80" rx="12" ry="10" fill={DEMON_LT} stroke="none" />
      <path d="M60 70 L60 112" stroke={DEMON_DK} strokeWidth="2" />

      {/* muscular arms + clawed hands */}
      <path d="M34 76 Q18 88 20 108 L28 106 Q26 90 42 82 Z" fill={DEMON} />
      <path d="M18 108 l-3 6 m3 -6 l3 6 m-3 -6 l0 7" stroke={HORN} strokeWidth="3" strokeLinecap="round" />
      <path d="M86 76 Q102 88 100 108 L92 106 Q94 90 78 82 Z" fill={DEMON} />
      <path d="M102 108 l3 6 m-3 -6 l-3 6 m3 -6 l0 7" stroke={HORN} strokeWidth="3" strokeLinecap="round" />

      {/* horned head */}
      <path d="M36 48 Q36 22 60 22 Q84 22 84 48 Q84 68 60 80 Q36 68 36 48 Z" fill={DEMON} />
      {/* horns curving back */}
      <path d="M40 30 Q28 12 18 14 Q30 20 34 40 Z" fill={HORN} />
      <path d="M80 30 Q92 12 102 14 Q90 20 86 40 Z" fill={HORN} />
      {/* heavy brow */}
      <path d="M38 46 Q52 38 60 45 L57 52 Q50 46 42 49 Z" fill={DEMON_DK} stroke="none" />
      <path d="M82 46 Q68 38 60 45 L63 52 Q70 46 78 49 Z" fill={DEMON_DK} stroke="none" />
      {/* glowing eyes */}
      <ellipse cx="50" cy="53" rx="7" ry="5" fill={FLAME} transform="rotate(14 50 53)" />
      <ellipse cx="70" cy="53" rx="7" ry="5" fill={FLAME} transform="rotate(-14 70 53)" />
      <circle cx="51" cy="53" r="2.4" fill={INK} stroke="none" />
      <circle cx="69" cy="53" r="2.4" fill={INK} stroke="none" />
      {/* fanged snarl */}
      <path d="M46 68 Q60 76 74 68" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M52 70 L49 62 L56 69 Z" fill={PAPER} />
      <path d="M68 70 L71 62 L64 69 Z" fill={PAPER} />
    </svg>
  );
}

/** Pick the boss sprite for a boss id (falls back to the Goblin). */
export function BossSprite({ id, hurt }) {
  if (id === 'giant_rat') return <GiantRatSprite hurt={hurt} />;
  if (id === 'skeleton') return <SkeletonSprite hurt={hurt} />;
  if (id === 'hobgoblin') return <HobgoblinSprite hurt={hurt} />;
  if (id === 'lesser_demon') return <LesserDemonSprite hurt={hurt} />;
  return <GoblinSprite hurt={hurt} />;
}
