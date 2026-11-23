import Link from 'next/link'
import { CalendarClock, Droplet, FlaskConical, MapPin, Phone, Pill, Scale, ShieldAlert, Stethoscope, TriangleAlert } from 'lucide-react'
import { emUso, linhaDoTempo, type Dossie, type ItemLinha } from '@/lib/dossie'
import type { Alerta } from '@/lib/alertas'
import { dataBR, horaBR, idade, ORIGEM, REDE, TIPO_ATENDIMENTO, TIPO_ORG, registroProf } from '@/lib/formato'
import s from './DossieView.module.css'

const FILTROS = [
  { k: 'tudo', rotulo: 'Tudo' },
  { k: 'atendimentos', rotulo: 'Atendimentos' },
  { k: 'exames', rotulo: 'Exames' },
  { k: 'remedios', rotulo: 'Remédios' },
] as const

function Origem({ o }: { o: string }) {
  const x = ORIGEM[o] ?? ORIGEM.paciente_manual
  return <span className={`pill ${x.classe}`}>{x.rotulo}</span>
}

function passa(item: ItemLinha, f: string) {
  if (f === 'atendimentos') return item.tipo === 'atendimento'
  if (f === 'exames') return item.tipo === 'resultado' || (item.tipo === 'atendimento' && item.exames.length > 0)
  if (f === 'remedios') return item.tipo === 'medicamento' || (item.tipo === 'atendimento' && item.medicamentos.length > 0)
  return true
}

type Acesso = { id: string | number; ator_nome: string; organizacao_nome: string | null; acao: string; em: string }

// Dossiê do paciente. Mesmo componente para o paciente (visão própria) e para o profissional (com alertas no topo).
export function DossieView({ d, f = 'tudo', alertas = [], acessos = [], modo = 'paciente', base, cabecalho = true }: { d: Dossie; f?: string; alertas?: Alerta[]; acessos?: Acesso[]; modo?: 'paciente' | 'profissional'; base: string; cabecalho?: boolean }) {
  const p = d.paciente
  const ativos = d.medicamentos.filter((m) => emUso(m))
  const condicoes = d.condicoes.filter((c) => c.status !== 'resolvida')
  const itens = linhaDoTempo(d).filter((i) => passa(i, f))
  const lugares = new Set(d.atendimentos.map((a) => a.organizacoes?.id)).size

  return (
    <div className={s.pagina}>
      {cabecalho && <section className={`${s.cabeca} entra`} id="resumo" style={{ ['--i' as string]: 0 }}>
        <div className={s.cabTopo}>
          <span className={s.avatar} aria-hidden="true">{p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>
          <div className={s.quem}>
            <span className="eyebrow">{modo === 'profissional' ? 'Dossiê compartilhado com a clínica' : 'Meu dossiê de saúde'}</span>
            <h1>{p.nome}</h1>
            <div className={s.chips}>
              <span><CalendarClock size={14} aria-hidden="true" />{idade(p.nascimento)} · {dataBR(p.nascimento)}</span>
              {p.peso_kg ? <span><Scale size={14} aria-hidden="true" />{String(p.peso_kg).replace('.', ',')} kg</span> : null}
              {p.tipo_sanguineo ? <span><Droplet size={14} aria-hidden="true" />{p.tipo_sanguineo}</span> : null}
              {p.cidade ? <span><MapPin size={14} aria-hidden="true" />{p.cidade}</span> : null}
              {p.gestante && <span className={s.gest}>Gestante</span>}
            </div>
          </div>
        </div>
        <div className={s.cabNums}>
          <div><strong className="num">{d.atendimentos.length}</strong><span>atendimentos</span></div>
          <div><strong className="num">{lugares}</strong><span>lugares</span></div>
          <div><strong className="num">{ativos.length}</strong><span>remédios em uso</span></div>
          <div className={s.emerg}><Phone size={15} aria-hidden="true" /><span><small>Emergência</small>{p.contato_emergencia ?? 'Não informado'}</span></div>
        </div>
      </section>}

      {alertas.length > 0 && (
        <section className={`card ${s.alertas} entra`} style={{ ['--i' as string]: 1 }} aria-labelledby="t-alertas" id="alertas">
          <header><span className={s.alIco} aria-hidden="true"><TriangleAlert size={18} /></span><div><h2 id="t-alertas">{modo === 'profissional' ? 'Atenção antes de atender' : 'Mostre ao seu médico'}</h2><p>Regras conferidas sobre o histórico de todos os lugares. Apoio, não diagnóstico.</p></div></header>
          <ul>{alertas.map((a) => (
            <li key={a.id} className={a.gravidade === 'alta' ? s.alta : s.media}><strong>{a.titulo}</strong><span>{a.detalhe}</span></li>
          ))}</ul>
        </section>
      )}

      <section className={s.bento} aria-label="Resumo clínico">
        <div className={`card ${s.bloco} ${d.alergias.length ? s.blocoAlergia : ''} entra`} style={{ ['--i' as string]: 2 }}>
          <h2><ShieldAlert size={18} aria-hidden="true" />Alergias</h2>
          {d.alergias.length === 0 ? <p className={s.vazio}>Nenhuma alergia registrada.</p> : (
            <ul>{d.alergias.map((a) => (
              <li key={a.id}><span className={s.liTopo}><strong>{a.substancia}</strong>{a.gravidade && <span className={`pill ${a.gravidade === 'grave' ? 'pill-crit' : 'pill-warn'}`}>{a.gravidade}</span>}</span><small>{a.reacao}</small></li>
            ))}</ul>
          )}
        </div>
        <div className={`card ${s.bloco} ${s.blocoRemedio} entra`} style={{ ['--i' as string]: 3 }}>
          <h2><Pill size={18} aria-hidden="true" />Remédios em uso <span className={`${s.cont} num`}>{ativos.length}</span></h2>
          {ativos.length === 0 ? <p className={s.vazio}>Nenhum remédio em uso.</p> : (
            <ul className={s.remedios}>{ativos.map((m) => (
              <li key={m.id}><strong>{m.nome}</strong><small>{[m.dose, m.posologia].filter(Boolean).join(', ')}</small><small className={s.prescr}>{m.profissionais ? m.profissionais.nome : 'Prescritor não informado'}</small></li>
            ))}</ul>
          )}
        </div>
        <div className={`card ${s.bloco} entra`} style={{ ['--i' as string]: 4 }}>
          <h2><Stethoscope size={18} aria-hidden="true" />Condições</h2>
          {condicoes.length === 0 ? <p className={s.vazio}>Nenhuma condição registrada.</p> : (
            <ul>{condicoes.map((c) => (
              <li key={c.id}><span className={s.liTopo}><strong>{c.descricao}</strong>{c.cronica ? <span className="pill pill-info">crônica</span> : c.status === 'hipotese' ? <span className="pill pill-neutra">hipótese</span> : null}</span><small className="mono">{c.cid10 ? `CID ${c.cid10}` : ''}{c.inicio ? ` · desde ${dataBR(c.inicio)}` : ''}</small></li>
            ))}</ul>
          )}
        </div>
      </section>

      <section className={s.linha} id="linha" aria-labelledby="t-linha">
        <div className={s.linhaTopo}>
          <h2 id="t-linha">Linha do tempo</h2>
          <nav className={s.filtros} aria-label="Filtrar a linha do tempo">
            {FILTROS.map((x) => <Link key={x.k} href={`${base}?f=${x.k}#linha`} scroll={false} className={x.k === f ? s.on : ''} aria-current={x.k === f ? 'page' : undefined}>{x.rotulo}</Link>)}
          </nav>
        </div>
        {itens.length === 0 && <p className={s.vazio}>Nada por aqui com esse filtro.</p>}
        <ol className={s.itens}>
          {itens.map((i) => {
            if (i.tipo === 'atendimento') {
              const a = i.a
              return (
                <li key={`a-${a.id}`} className={s.item}>
                  <span className={`${s.ponto} ${s.pAt}`} aria-hidden="true"><Stethoscope size={15} /></span>
                  <article className={`card ${s.cartao}`}>
                    <div className={s.cTopo}><time className="mono">{dataBR(a.data)} · {horaBR(a.data)}</time><span className={s.tags}><span className={`pill ${REDE[a.rede]?.classe}`}>{REDE[a.rede]?.rotulo}{a.operadora ? ` · ${a.operadora}` : ''}</span><Origem o={a.origem} /></span></div>
                    <h3><span className={s.tipo}>{TIPO_ATENDIMENTO[a.tipo] ?? a.tipo}</span>{a.organizacoes?.nome ?? 'Local não informado'}</h3>
                    <p className={s.meta}>{a.profissionais ? `${a.profissionais.nome} · ${a.profissionais.especialidade ?? ''} · ${registroProf(a.profissionais)}` : 'Profissional não informado'}{a.organizacoes ? ` · ${TIPO_ORG[a.organizacoes.tipo]} em ${a.organizacoes.cidade}` : ''}</p>
                    <dl className={s.campos}>
                      {a.queixa && <><dt>Queixa</dt><dd>{a.queixa}</dd></>}
                      {a.hipotese && <><dt>Hipótese</dt><dd><strong>{a.hipotese}</strong></dd></>}
                      {a.conduta && <><dt>Conduta</dt><dd>{a.conduta}</dd></>}
                    </dl>
                    {(i.medicamentos.length > 0 || i.exames.length > 0) && (
                      <div className={s.filhos}>
                        {i.medicamentos.map((m) => <span key={m.id} className={s.chip}><Pill size={13} aria-hidden="true" />{m.nome}</span>)}
                        {i.exames.map((e) => <span key={e.id} className={s.chip}><FlaskConical size={13} aria-hidden="true" />{e.nome}{e.resultado_em ? '' : ' · aguardando'}</span>)}
                      </div>
                    )}
                  </article>
                </li>
              )
            }
            if (i.tipo === 'resultado') {
              const e = i.e
              return (
                <li key={`r-${e.id}`} className={s.item}>
                  <span className={`${s.ponto} ${e.alterado ? s.pAlt : s.pEx}`} aria-hidden="true"><FlaskConical size={15} /></span>
                  <article className={`card ${s.cartao}`}>
                    <div className={s.cTopo}><time className="mono">{dataBR(e.resultado_em)}</time><Origem o={e.origem} /></div>
                    <h3><span className={s.tipo}>Resultado</span>{e.nome}{e.alterado && <span className="pill pill-warn">alterado</span>}</h3>
                    <p className={s.meta}>{e.organizacoes?.nome ?? ''}{e.pedido_em ? ` · pedido em ${dataBR(e.pedido_em)}` : ''}</p>
                    <p className={s.texto}>{e.resultado}</p>
                  </article>
                </li>
              )
            }
            const m = i.m
            return (
              <li key={`m-${m.id}`} className={s.item}>
                <span className={`${s.ponto} ${s.pMed}`} aria-hidden="true"><Pill size={15} /></span>
                <article className={`card ${s.cartao}`}>
                  <div className={s.cTopo}><time className="mono">{dataBR(m.inicio)}</time><Origem o={m.origem} /></div>
                  <h3><span className={s.tipo}>Remédio</span>{m.nome}</h3>
                  <p className={s.meta}>{[m.dose, m.posologia].filter(Boolean).join(', ')}{m.profissionais ? ` · ${m.profissionais.nome} (${m.profissionais.especialidade ?? ''})` : ''}</p>
                </article>
              </li>
            )
          })}
        </ol>
      </section>

      {acessos.length > 0 && (
        <section className={`card ${s.acessos}`} id="acessos" aria-labelledby="t-acessos">
          <h2 id="t-acessos">Quem abriu este dossiê</h2>
          <ul>{acessos.map((a) => (
            <li key={a.id}><span className={s.aPonto} aria-hidden="true" /><span><strong>{a.ator_nome}</strong>{a.organizacao_nome ? `, ${a.organizacao_nome},` : ''} {({ registrou_atendimento: 'registrou um atendimento', acesso_emergencia: 'usou o acesso de emergência', revogou: 'revogou um consentimento', consentiu: 'deu um consentimento', registrou_adendo: 'registrou um adendo' } as Record<string, string>)[a.acao] ?? 'abriu o dossiê'}</span><time className="mono">{dataBR(a.em)} · {horaBR(a.em)}</time></li>
          ))}</ul>
        </section>
      )}
      <p className="aviso-demo" style={{ justifySelf: 'start' }}>Demonstração com dados fictícios. Cada registro mostra de onde veio.</p>
    </div>
  )
}
