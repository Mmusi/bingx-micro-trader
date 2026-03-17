// components/Tooltip.tsx — Info tooltip

import React, { useState } from 'react';

interface Props { text: string; }

export default function Tooltip({ text }: Props) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5, cursor: 'help' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid #4a7a99', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#4a7a99', fontFamily: "'Orbitron',sans-serif" }}>?</span>
      {show && (
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#071520', border: '1px solid #0d2a3d', borderRadius: 3, padding: '8px 10px', width: 220, fontSize: 10, color: '#8ec8e8', fontFamily: "'Share Tech Mono',monospace", zIndex: 999, lineHeight: 1.5, whiteSpace: 'normal' }}>
          {text}
        </div>
      )}
    </span>
  );
}
