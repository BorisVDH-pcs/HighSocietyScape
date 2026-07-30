import { useEffect, useRef } from 'react';

export default function CombatLog({ log }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log.length]);

  return (
    <div className="combatlog">
      <div className="combatlog-title">Combat log</div>
      <div className="combatlog-lines">
        {log.map((e, i) => (
          <div key={i} className={`logline ${e.t}`}>
            {e.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
