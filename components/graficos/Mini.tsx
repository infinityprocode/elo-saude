import type { Ponto } from '@/lib/clinica-demo'

const CORES: Record<string, string> = { cobalt: '#2f6fe9', sky: '#42a8f5', aqua: '#13a8a0', warn: '#f0a23a' }

// Minigráfico (sparkline) com área suave e ponto final destacado.
export function Mini({ serie, cor = 'cobalt', id }: { serie: Ponto[]; cor?: string; id: string }) {
  const w = 120, h = 44, pad = 4
  const vs = serie.map((p) => p.v), min = Math.min(...vs), max = Math.max(...vs)
  const x = (i: number) => pad + (i / Math.max(serie.length - 1, 1)) * (w - pad * 2)
  const y = (v: number) => h - pad - ((v - min) / Math.max(max - min, 1)) * (h - pad * 2)
  const pts = serie.map((p, i) => [x(i), y(p.v)] as const)
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}` }
  const c = CORES[cor] ?? CORES.cobalt
  const ult = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <defs><linearGradient id={`m-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".28" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${ult[0]},${h} L${pts[0][0]},${h} Z`} fill={`url(#m-${id})`} />
      <path d={d} fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={ult[0]} cy={ult[1]} r="3.6" fill="#fbfdff" stroke={c} strokeWidth="2.2" />
    </svg>
  )
}
