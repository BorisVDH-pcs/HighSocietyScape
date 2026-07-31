import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { BossSprite } from './Sprite.jsx';
import { MAP_WORLD } from '../game/combat.js';

// A pannable 2D world map. Boss "nodes" (mini sprite + name + level) sit at
// fixed coordinates in a world larger than the viewport; the player drags /
// swipes to explore it. Locked bosses are greyed and unclickable; the current
// boss is ringed. Designed to scale: adding bosses is just more coordinates
// (see BOSS_LADDER `map` + MAP_WORLD in game/combat.js), and the map pans to
// reach them.

const DRAG_SLOP = 8; // px of movement past which a pointer gesture is a drag, not a tap

export default function BossMap({ bosses, currentId, maxUnlocked, onSelect, onClose }) {
  const vpRef = useRef(null);
  const drag = useRef(null); // active gesture: { sx, sy, px, py }
  const movedRef = useRef(0); // distance of the last gesture (tap vs drag guard)
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Keep the world within view: never scroll past its edges.
  const clamp = useCallback((p) => {
    const vp = vpRef.current;
    const vw = vp ? vp.clientWidth : 0;
    const vh = vp ? vp.clientHeight : 0;
    const minX = Math.min(0, vw - MAP_WORLD.w);
    const minY = Math.min(0, vh - MAP_WORLD.h);
    return { x: Math.max(minX, Math.min(0, p.x)), y: Math.max(minY, Math.min(0, p.y)) };
  }, []);

  // On open, centre the viewport on the current boss.
  useLayoutEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const cur = bosses.find((b) => b.id === currentId) ?? bosses[0];
    setPan(clamp({ x: vp.clientWidth / 2 - cur.map.x, y: vp.clientHeight / 2 - cur.map.y }));
  }, [bosses, currentId, clamp]);

  const onPointerDown = (e) => {
    // NOTE: do NOT setPointerCapture here. Capturing on pointerdown redirects the
    // pointerup to this container, which suppresses the `click` on boss-node
    // buttons — making nodes unselectable (tap does nothing). We capture only
    // once the gesture is a real drag (see onPointerMove).
    drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, captured: false };
    movedRef.current = 0;
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    movedRef.current = Math.abs(dx) + Math.abs(dy);
    // Promote to a captured drag only past the slop threshold, so a tap never
    // captures and its click reaches the node button.
    if (!drag.current.captured && movedRef.current > DRAG_SLOP) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      drag.current.captured = true;
    }
    setPan(clamp({ x: drag.current.px + dx, y: drag.current.py + dy }));
  };
  const endDrag = (e) => {
    if (drag.current?.captured) e.currentTarget.releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };

  return (
    <div className="bossmap">
      <div className="maphead">
        <button className="mbtn back" onClick={onClose}>← BACK</button>
        <span className="maptitle">WORLD MAP</span>
        <span className="maphint">drag to explore ↔</span>
      </div>

      <div
        className="mapview"
        ref={vpRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="mapworld"
          style={{ width: MAP_WORLD.w, height: MAP_WORLD.h, transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          {/* trail connecting the bosses in ladder order */}
          <svg className="mappath" width={MAP_WORLD.w} height={MAP_WORLD.h} aria-hidden="true">
            <polyline
              points={bosses.map((b) => `${b.map.x},${b.map.y}`).join(' ')}
              fill="none"
              stroke="#8a6a1e"
              strokeWidth="3"
              strokeDasharray="2 7"
              strokeLinecap="round"
            />
          </svg>

          {bosses.map((b, i) => {
            const locked = i > maxUnlocked;
            const isCurrent = b.id === currentId;
            return (
              <button
                key={b.id}
                className={`mapnode ${locked ? 'locked' : ''} ${isCurrent ? 'current' : ''}`}
                style={{ left: b.map.x, top: b.map.y }}
                disabled={locked}
                onClick={() => {
                  if (movedRef.current > DRAG_SLOP) return; // it was a drag, not a tap
                  onSelect(b.id);
                }}
              >
                <span className="mapnode-icon">
                  <BossSprite id={b.id} />
                </span>
                <span className="mapnode-name">
                  {locked ? '🔒 ' : ''}
                  {b.name}
                </span>
                <span className="mapnode-lvl">{locked ? 'locked' : `Lv ${b.level}`}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
