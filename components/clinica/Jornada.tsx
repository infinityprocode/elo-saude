import Link from 'next/link'
import { Building2, FlaskConical, Hospital, Stethoscope, TriangleAlert } from 'lucide-react'
import type { Dossie } from '@/lib/dossie'
import type { Alerta } from '@/lib/alertas'
import { dataBR } from '@/lib/formato'
import { retrato, iniciais } from '@/lib/retratos'
import s from './Jornada.module.css'

// Rede de cada passo: no atendimento vem do registro (SUS, particular ou convênio); no exame, da unidade.
export function redeDe(rede?: string): { rotulo: string; classe: string } {
  if (rede === 'sus' || rede === 'publica') return { rotulo: 'SUS', classe: s.sus }
  if (rede === 'convenio') return { rotulo: 'Convênio', classe: s.conv }
  return { rotulo: 'Particular', classe: s.part }
}
const ICONE: Record<string, typeof Hospital> = { ubs: Building2, upa: Hospital, laboratorio: FlaskConical, clinica: Stethoscope, consultorio: Stethoscope }

type Passo = { id: string; quando: string; onde: string; tipo?: string; rede?: string; o_que: string; detalhe?: string; alerta?: boolean }

// Peça-assinatura do Elo: o caminho do paciente por todos os lugares, com a rede e o ponto onde algo não combina.
export function Jornada({ d, alertas, hora, clinica, href }: { d: Dossie; alertas: Alerta[]; hora: string; clinica: string; href?: string }) {
  const divergente = new Set(alertas.filter((a) => a.tipo === 'divergencia').flatMap((a) => a.id.replace('div-', '').split(/-(?=[0-9a-f]{8}-)/)))
  const passos: Passo[] = [
    ...d.atendimentos.map((a) => ({ id: a.id, quando: a.data, onde: a.organizacoes?.nome ?? 'Local não informado', tipo: a.organizacoes?.tipo, rede: a.rede, o_que: a.hipotese ?? a.queixa ?? 'Atendimento', detalhe: a.profissionais?.nome, alerta: divergente.has(a.id) })),
    // exames só quando alterados: o caminho mostra os atendimentos e o que pede atenção
    ...d.exames.filter((e) => e.resultado_em && e.alterado).map((e) => ({ id: e.id, quando: e.resultado_em + 'T18:00:00-03:00', onde: e.organizacoes?.nome ?? 'Laboratório', tipo: e.organizacoes?.tipo, rede: e.organizacoes?.rede, o_que: `${e.nome}${e.alterado ? ' alterado' : ''}`, detalhe: e.resultado ?? undefined })),
  ].sort((a, b) => (a.quando < b.quando ? -1 : 1)).slice(-5)
  const principal = alertas[0]
  return (
    <section className={`card ${s.caixa}`} aria-labelledby="t-jornada">
      <header className={s.topo}>
        <div className={s.quem}>
          {retrato(d.paciente.nome) ? <img src={retrato(d.paciente.nome)} alt="" width={52} height={52} className={s.foto} /> : <span className={s.ini} aria-hidden="true">{iniciais(d.paciente.nome)}</span>}
          <div><span className={s.eyebrow}>Jornada antes da consulta · hoje às {hora}</span><h2 id="t-jornada">{d.paciente.nome}</h2></div>
        </div>
        <div className={s.legenda}><span className={s.sus}>SUS</span><span className={s.part}>Particular</span><span className={s.conv}>Convênio</span></div>
      </header>
      <ol className={s.trilho}>
        {passos.map((p) => {
          const r = redeDe(p.rede); const Ic = ICONE[p.tipo ?? ''] ?? Stethoscope
          return (
            <li key={p.id} className={`${s.passo} ${p.alerta ? s.passoAlerta : ''}`}>
              <span className={`${s.no} ${r.classe}`} aria-hidden="true"><Ic size={18} /></span>
              <time className="num">{dataBR(p.quando).slice(0, 5)}</time>
              <strong>{p.o_que}</strong>
              <span className={s.onde}>{p.onde}</span>
              <span className={`${s.rede} ${r.classe}`}>{r.rotulo}</span>
              {p.alerta && <span className={s.bandeira}><TriangleAlert size={13} aria-hidden="true" />diverge</span>}
            </li>
          )
        })}
        <li className={`${s.passo} ${s.hoje}`}>
          <span className={`${s.no} ${s.part}`} aria-hidden="true"><Stethoscope size={18} /></span>
          <time className="num">Hoje {hora}</time>
          <strong>Consulta de retorno</strong>
          <span className={s.onde}>{clinica}</span>
          <span className={`${s.rede} ${s.part}`}>Particular</span>
        </li>
      </ol>
      {principal && (
        <Link href={href ?? `/clinica/p/${d.paciente.id}`} className={s.achado}>
          <span className={s.achadoIco} aria-hidden="true"><TriangleAlert size={18} /></span>
          <span><strong>{principal.titulo}.</strong> {principal.detalhe}</span>
          <span className={s.abrir}>{href?.startsWith('#') ? 'Ver na demonstração' : 'Abrir dossiê'}</span>
        </Link>
      )}
    </section>
  )
}
