// components/Tooltip.tsx — Info tooltip
// FIX: Uses fixed positioning tracked by mouse so it NEVER clips inside overflow:hidden panels.
// The tooltip renders in document flow at fixed coordinates — always visible regardless of panel overflow.

import React, { useState, useCallback, useRef } from 'react';

interface Props { text: string; }

export default function Tooltip({ text }: Props) {
  const [pos, setPos]   = useState<{ x: number; y: number } | null>(null);
  const ref             = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5, cursor: 'help' }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <span style={{
        width: 13, height: 13, borderRadius: '50%',
        border: '1px solid #4a7a99',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, color: '#4a7a99',
        fontFamily: "'Orbitron', sans-serif",
        flexShrink: 0,
        userSelect: 'none',
      }}>?</span>

      {pos && (
        <div style={{
          position:    'fixed',
          left:        pos.x,
          top:         pos.y - 8,
          transform:   'translate(-50%, -100%)',
          background:  '#071520',
          border:      '1px solid #0d2a3d',
          borderRadius: 3,
          padding:     '8px 10px',
          width:       220,
          fontSize:    10,
          color:       '#8ec8e8',
          fontFamily:  "'Share Tech Mono', monospace",
          zIndex:      99999,
          lineHeight:  1.5,
          whiteSpace:  'normal',
          pointerEvents: 'none',
          boxShadow:   '0 4px 16px rgba(0,0,0,0.6)',
        }}>
          {text}
        </div>
      )}
    </span>
  );
}
