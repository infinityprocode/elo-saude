import type { Ponto } from '@/lib/clinica-demo'

// Barras finas por dia, como na referência: dia útil em verde, sábado em âmbar, domingo (fechado) em cinza.
// Marcador no pico do período.
export function Barras({ serie }: { serie: Ponto[] }) {
  const W = 600, H = 150, n = serie.length, passo = W / n
  const max = Math.max(...serie.map((p) => p.v), 1)
  const pico = serie.reduce((m, p, i) => (p.v > serie[m].v ? i : m), 0)
  const dow = (iso: string) => new Date(iso + 'T12:00:00-03:00').getDay()
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" role="img" aria-label={`Atendimentos por dia; pico de ${serie[pico].v}`} style={{ display: 'block' }}>
      {serie.map((p, i) => {
        const d = dow(p.data), h = p.v ? Math.max(6, (p.v / max) * H) : 6
        const cor = d === 0 ? '#d6dfeb' : d === 6 ? '#f0b252' : '#3fb57f'
        return <rect key={p.data} x={i * passo + passo * 0.3} y={H + 18 - h} width={passo * 0.4} height={h} rx={passo * 0.2} fill={cor} />
      })}
      <circle cx={pico * passo + passo / 2} cy={H + 18 - (serie[pico].v / max) * H - 9} r="7" fill="#3fb57f" stroke="#fbfdff" strokeWidth="2.5" />
      <path d={`M${pico * passo + passo / 2 - 3} ${H + 18 - (serie[pico].v / max) * H - 9}l2.2 2.2 4-4.4`} stroke="#fbfdff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}
