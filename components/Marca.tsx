// Marca do Elo Saúde: dois elos entrelaçados (paciente e cuidado) com o ponto de encontro.
export function Simbolo({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="elo-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#42a8f5" /><stop offset="1" stopColor="#1f5bd6" /></linearGradient>
        <linearGradient id="elo-b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#13a8a0" /><stop offset="1" stopColor="#42a8f5" /></linearGradient>
      </defs>
      <rect x="0" y="0" width="40" height="40" rx="12" fill="#eef4ff" />
      <rect x="6" y="12" width="19" height="16" rx="8" fill="none" stroke="url(#elo-a)" strokeWidth="3.4" />
      <rect x="15" y="12" width="19" height="16" rx="8" fill="none" stroke="url(#elo-b)" strokeWidth="3.4" />
      <circle cx="20" cy="20" r="2.4" fill="#0d1b33" />
    </svg>
  )
}

export function Marca({ tamanho = 32, sub }: { tamanho?: number; sub?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <Simbolo tamanho={tamanho} />
      <span style={{ display: 'grid', lineHeight: 1.1 }}>
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Elo Saúde</span>
        {sub && <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{sub}</span>}
      </span>
    </span>
  )
}
