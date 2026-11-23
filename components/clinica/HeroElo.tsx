// Momento-assinatura do painel: dois elos (paciente e cuidado) atravessados por uma linha de batimento que se desenha.
export function HeroElo() {
  return (
    <svg viewBox="0 0 520 260" width="100%" height="100%" aria-hidden="true" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="he-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7cc4ff" /><stop offset="1" stopColor="#2f6fe9" /></linearGradient>
        <linearGradient id="he-b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#13a8a0" /><stop offset="1" stopColor="#7cc4ff" /></linearGradient>
        <linearGradient id="he-pulso" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2f6fe9" stopOpacity="0" /><stop offset=".35" stopColor="#2f6fe9" /><stop offset=".7" stopColor="#13a8a0" /><stop offset="1" stopColor="#13a8a0" stopOpacity="0" /></linearGradient>
        <radialGradient id="he-brilho" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
        <filter id="he-sombra" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <g opacity=".35" filter="url(#he-sombra)">
        <rect x="128" y="70" width="170" height="130" rx="65" fill="none" stroke="#2f6fe9" strokeWidth="26" />
        <rect x="222" y="70" width="170" height="130" rx="65" fill="none" stroke="#13a8a0" strokeWidth="26" />
      </g>
      <rect x="128" y="64" width="170" height="130" rx="65" fill="none" stroke="url(#he-a)" strokeWidth="18" className="he-elo1" />
      <rect x="222" y="64" width="170" height="130" rx="65" fill="none" stroke="url(#he-b)" strokeWidth="18" />
      {/* devolve o trecho do primeiro elo por cima, para o entrelaçamento */}
      <path d="M298 129 A65 65 0 0 1 263 186" fill="none" stroke="url(#he-a)" strokeWidth="18" strokeLinecap="round" />
      <circle cx="260" cy="129" r="34" fill="url(#he-brilho)" />
      <path className="he-pulso" d="M10 132 H150 L170 132 L184 96 L200 170 L216 70 L232 150 L244 132 H300 L316 132 L328 110 L340 150 L352 132 H510" fill="none" stroke="url(#he-pulso)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" pathLength="100" />
      <circle r="5" fill="#fbfdff" stroke="#2f6fe9" strokeWidth="2.5" className="he-ponto">
        <animateMotion dur="3.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" path="M10 132 H150 L170 132 L184 96 L200 170 L216 70 L232 150 L244 132 H300 L316 132 L328 110 L340 150 L352 132 H510" />
      </circle>
      <style>{`
        .he-pulso { stroke-dasharray: 100; animation: he-desenha 3.6s cubic-bezier(.2,.8,.2,1) infinite; }
        @keyframes he-desenha { 0% { stroke-dashoffset: 100 } 60% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: -100 } }
        @media (prefers-reduced-motion: reduce) { .he-pulso { animation: none; stroke-dasharray: none } .he-ponto { display: none } }
      `}</style>
    </svg>
  )
}
