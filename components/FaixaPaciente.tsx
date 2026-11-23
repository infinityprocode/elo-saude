import { CalendarClock, Droplet, MapPin, Phone, Scale } from 'lucide-react'
import type { Dossie } from '@/lib/dossie'
import { emUso } from '@/lib/dossie'
import { dataBR, idade } from '@/lib/formato'
import s from './FaixaPaciente.module.css'

// Faixa do topo no dossiê: nome grande e fino, dados essenciais em chips, números do histórico.
export function FaixaPaciente({ d, eyebrow }: { d: Dossie; eyebrow: string }) {
  const p = d.paciente
  const lugares = new Set(d.atendimentos.map((a) => a.organizacoes?.id)).size
  return (
    <div className={s.faixa}>
      <div className={s.txt}>
        <span className={s.eyebrow}>{eyebrow}</span>
        <h1>{p.nome}</h1>
        <div className={s.chips}>
          <span><CalendarClock size={15} aria-hidden="true" />{idade(p.nascimento)} · {dataBR(p.nascimento)}</span>
          {p.peso_kg ? <span><Scale size={15} aria-hidden="true" />{String(p.peso_kg).replace('.', ',')} kg</span> : null}
          {p.tipo_sanguineo ? <span><Droplet size={15} aria-hidden="true" />{p.tipo_sanguineo}</span> : null}
          {p.cidade ? <span><MapPin size={15} aria-hidden="true" />{p.cidade}</span> : null}
          {p.gestante && <span className={s.gest}>Gestante</span>}
        </div>
      </div>
      <div className={s.lado}>
        <div className={s.nums}>
          <div><strong className="num">{d.atendimentos.length}</strong><span>atendimentos</span></div>
          <div><strong className="num">{lugares}</strong><span>{lugares === 1 ? 'lugar' : 'lugares'}</span></div>
          <div><strong className="num">{d.medicamentos.filter((m) => emUso(m)).length}</strong><span>remédios em uso</span></div>
        </div>
        <span className={s.emerg}><Phone size={15} aria-hidden="true" />Emergência: <strong>{p.contato_emergencia ?? 'não informado'}</strong></span>
      </div>
    </div>
  )
}
