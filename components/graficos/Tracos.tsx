// Medidor de tracinhos (padrão da referência): N barras finas, a fração preenchida na cor do estado.
export function Tracos({ fracao, cor = 'ok', n = 56, rotulos }: { fracao: number; cor?: 'ok' | 'crit' | 'cobalt' | 'warn'; n?: number; rotulos?: [string, string, string, string] }) {
  const CORES = { ok: '#3fb57f', crit: '#e0524a', cobalt: '#2f6fe9', warn: '#f0a23a' }
  const cheio = Math.round(Math.max(0, Math.min(1, fracao)) * n)
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rotulos && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)' }}><span>{rotulos[0]}</span><span>{rotulos[1]}</span></div>}
      <svg viewBox={`0 0 ${n * 6} 36`} width="100%" height="36" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
        {Array.from({ length: n }, (_, i) => <rect key={i} x={i * 6 + 1} y="0" width="2.6" height="36" rx="1.3" fill={i < cheio ? CORES[cor] : '#d6dfeb'} />)}
      </svg>
      {rotulos && <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}><span>{rotulos[2]}</span><span>{rotulos[3]}</span></div>}
    </div>
  )
}
