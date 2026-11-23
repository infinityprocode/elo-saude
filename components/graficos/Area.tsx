'use client'
import { useState } from 'react'
import type { Ponto } from '@/lib/clinica-demo'
import s from './Area.module.css'

const W = 640, H = 240, L = 40, R = 16, T = 20, B = 30
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const rot = (iso: string) => `${Number(iso.slice(8))} ${MES[Number(iso.slice(5, 7)) - 1]}`

// Gráfico de área dos atendimentos por dia. Valor aparece ao passar o mouse ou tocar.
export function Area({ serie }: { serie: Ponto[] }) {
  const [sel, setSel] = useState<number>(serie.length - 1)
  const max = Math.max(...serie.map((p) => p.v)), topo = Math.ceil(max / 10) * 10 || 10
  const x = (i: number) => L + (i / (serie.length - 1)) * (W - L - R)
  const y = (v: number) => T + (1 - v / topo) * (H - T - B)
  const pts = serie.map((p, i) => [x(i), y(p.v)] as const)
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}` }
  const ticksY = [0, topo / 2, topo]
  const ticksX = serie.map((p, i) => ({ i, p })).filter(({ i }) => i % 7 === (serie.length - 1) % 7)
  const p = serie[sel], [px, py] = pts[sel]

  function mover(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((vx - L) / (W - L - R)) * (serie.length - 1))
    setSel(Math.min(serie.length - 1, Math.max(0, i)))
  }

  return (
    <div className={s.wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label="Atendimentos por dia nos últimos 30 dias" onPointerMove={mover} onPointerDown={mover}>
        <defs>
          <linearGradient id="area-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f6fe9" stopOpacity=".26" /><stop offset="1" stopColor="#2f6fe9" stopOpacity="0" /></linearGradient>
          <linearGradient id="area-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#42a8f5" /><stop offset="1" stopColor="#1f5bd6" /></linearGradient>
        </defs>
        {ticksY.map((t) => (
          <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e0e8f3" strokeDasharray={t ? '3 5' : undefined} /><text x={L - 10} y={y(t) + 4} textAnchor="end" className={s.eixo}>{t}</text></g>
        ))}
        {ticksX.map(({ i, p: q }) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className={s.eixo}>{rot(q.data)}</text>)}
        <path d={`${d} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z`} fill="url(#area-f)" />
        <path d={d} fill="none" stroke="url(#area-l)" strokeWidth="2.6" strokeLinecap="round" />
        <line x1={px} x2={px} y1={T} y2={y(0)} stroke="#2f6fe9" strokeOpacity=".35" strokeDasharray="3 4" />
        <circle cx={px} cy={py} r="6" fill="#fbfdff" stroke="#2f6fe9" strokeWidth="3" />
      </svg>
      <div className={s.tip} style={{ left: `${(px / W) * 100}%`, top: `${(py / H) * 100}%`, transform: `translate(${px / W > 0.8 ? '-100%' : px / W < 0.2 ? '0%' : '-50%'}, calc(-100% - 16px))` }} aria-live="polite">
        <strong className="num">{p.v}</strong> <span>{p.v === 1 ? 'atendimento' : 'atendimentos'}</span><small>{rot(p.data)}</small>
      </div>
    </div>
  )
}
