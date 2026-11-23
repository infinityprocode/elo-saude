import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'
import { carregarDossie, emUso, linhaDoTempo, type ItemLinha } from '@/lib/dossie'
import { dataBR, horaBR, idade, ORIGEM, TIPO_ATENDIMENTO, TIPO_ORG } from '@/lib/formato'
import s from './dossie.module.css'

const FILTROS = [
  { k: 'tudo', rotulo: 'Tudo' },
  { k: 'atendimentos', rotulo: 'Atendimentos' },
  { k: 'exames', rotulo: 'Exames' },
  { k: 'remedios', rotulo: 'Remédios' },
] as const

function Origem({ o }: { o: string }) {
  const x = ORIGEM[o] ?? ORIGEM.paciente_manual
  return <span className={`badge ${x.classe}`}>{x.rotulo}</span>
}

function passa(item: ItemLinha, f: string) {
  if (f === 'tudo') return true
  if (f === 'atendimentos') return item.tipo === 'atendimento'
  if (f === 'exames') return item.tipo === 'resultado' || (item.tipo === 'atendimento' && item.exames.length > 0)
  if (f === 'remedios') return item.tipo === 'medicamento' || (item.tipo === 'atendimento' && item.medicamentos.length > 0)
  return true
}

export default async function DossiePaciente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string }> }) {
  const { id } = await params
  const { f = 'tudo' } = await searchParams
  const sb = await supabaseServidor()
  const d = await carregarDossie(sb, id)
  if (!d) notFound()
  const p = d.paciente
  const ativos = d.medicamentos.filter((m) => emUso(m))
  const condicoesAtivas = d.condicoes.filter((c) => c.status !== 'resolvida')
  const itens = linhaDoTempo(d).filter((i) => passa(i, f))

  return (
    <div className={s.pagina}>
      <section className={`card ${s.cabeca}`}>
        <div className={s.avatar} aria-hidden="true">{p.nome[0]}</div>
        <div className={s.quem}>
          <h1>{p.nome}</h1>
          <p className="mono">{idade(p.nascimento)} · nasc. {dataBR(p.nascimento)}{p.peso_kg ? ` · ${String(p.peso_kg).replace('.', ',')} kg` : ''}{p.tipo_sanguineo ? ` · ${p.tipo_sanguineo}` : ''}</p>
          {p.gestante && <span className="badge or-prof">Gestante</span>}
        </div>
        <div className={s.emergencia}>
          <span className="eyebrow">Contato de emergência</span>
          <span>{p.contato_emergencia ?? 'Não informado'}</span>
        </div>
      </section>

      <section className={s.resumo} aria-label="Resumo">
        <div className={`card ${s.bloco} ${d.alergias.length ? s.blocoAlerta : ''}`}>
          <h2>Alergias</h2>
          {d.alergias.length === 0 ? <p className={s.vazio}>Nenhuma alergia registrada.</p> : (
            <ul>{d.alergias.map((a) => (
              <li key={a.id}><strong>{a.substancia}</strong>{a.gravidade && <span className={`badge ${a.gravidade === 'grave' ? s.grave : s.moderada}`}>{a.gravidade}</span>}<small>{a.reacao}</small></li>
            ))}</ul>
          )}
        </div>
        <div className={`card ${s.bloco}`}>
          <h2>Remédios em uso <span className={s.cont}>{ativos.length}</span></h2>
          {ativos.length === 0 ? <p className={s.vazio}>Nenhum remédio em uso.</p> : (
            <ul>{ativos.map((m) => (
              <li key={m.id}><strong>{m.nome}</strong><small>{[m.dose, m.posologia].filter(Boolean).join(', ')}{m.profissionais ? ` · ${m.profissionais.nome}` : ''}</small></li>
            ))}</ul>
          )}
        </div>
        <div className={`card ${s.bloco}`}>
          <h2>Condições</h2>
          {condicoesAtivas.length === 0 ? <p className={s.vazio}>Nenhuma condição registrada.</p> : (
            <ul>{condicoesAtivas.map((c) => (
              <li key={c.id}><strong>{c.descricao}</strong>{c.cronica ? <span className="badge or-manual">crônica</span> : c.status === 'hipotese' ? <span className="badge or-manual">hipótese</span> : null}<small className="mono">{c.cid10 ? `CID ${c.cid10}` : ''}{c.inicio ? ` · desde ${dataBR(c.inicio)}` : ''}</small></li>
            ))}</ul>
          )}
        </div>
      </section>

      <section className={s.linha} aria-label="Linha do tempo">
        <div className={s.linhaTopo}>
          <h2>Linha do tempo</h2>
          <nav className={s.filtros} aria-label="Filtrar">
            {FILTROS.map((x) => (
              <Link key={x.k} href={`?f=${x.k}`} className={x.k === f ? s.on : ''} aria-current={x.k === f ? 'page' : undefined}>{x.rotulo}</Link>
            ))}
          </nav>
        </div>
        {itens.length === 0 && <p className={s.vazio}>Nada por aqui com esse filtro.</p>}
        <ol className={s.itens}>
          {itens.map((i) => {
            if (i.tipo === 'atendimento') {
              const a = i.a
              return (
                <li key={`a-${a.id}`} className={`card ${s.item}`}>
                  <div className={s.data}><span className="mono">{dataBR(a.data)}</span><span className="mono">{horaBR(a.data)}</span></div>
                  <div className={s.corpo}>
                    <div className={s.titulo}><span className={s.tipo}>{TIPO_ATENDIMENTO[a.tipo] ?? a.tipo}</span><h3>{a.organizacoes?.nome ?? 'Local não informado'}</h3><Origem o={a.origem} /></div>
                    <p className={s.meta}>{a.profissionais ? `${a.profissionais.nome} · ${a.profissionais.especialidade ?? ''} · ${a.profissionais.conselho} ${a.profissionais.registro}` : 'Profissional não informado'}{a.organizacoes ? ` · ${TIPO_ORG[a.organizacoes.tipo]} em ${a.organizacoes.cidade}` : ''}</p>
                    <dl className={s.campos}>
                      {a.queixa && <><dt>Queixa</dt><dd>{a.queixa}</dd></>}
                      {a.hipotese && <><dt>Hipótese</dt><dd><strong>{a.hipotese}</strong></dd></>}
                      {a.conduta && <><dt>Conduta</dt><dd>{a.conduta}</dd></>}
                    </dl>
                    {(i.medicamentos.length > 0 || i.exames.length > 0) && (
                      <div className={s.filhos}>
                        {i.medicamentos.map((m) => <span key={m.id} className={s.chip}>Remédio · {m.nome}</span>)}
                        {i.exames.map((e) => <span key={e.id} className={s.chip}>Exame · {e.nome}{e.resultado_em ? '' : ' (aguardando)'}</span>)}
                      </div>
                    )}
                  </div>
                </li>
              )
            }
            if (i.tipo === 'resultado') {
              const e = i.e
              return (
                <li key={`r-${e.id}`} className={`card ${s.item}`}>
                  <div className={s.data}><span className="mono">{dataBR(e.resultado_em)}</span></div>
                  <div className={s.corpo}>
                    <div className={s.titulo}><span className={s.tipo}>Resultado</span><h3>{e.nome}</h3>{e.alterado && <span className={`badge ${s.moderada}`}>alterado</span>}<Origem o={e.origem} /></div>
                    <p className={s.meta}>{e.organizacoes?.nome ?? ''}{e.pedido_em ? ` · pedido em ${dataBR(e.pedido_em)}` : ''}</p>
                    <p className={s.texto}>{e.resultado}</p>
                  </div>
                </li>
              )
            }
            const m = i.m
            return (
              <li key={`m-${m.id}`} className={`card ${s.item}`}>
                <div className={s.data}><span className="mono">{dataBR(m.inicio)}</span></div>
                <div className={s.corpo}>
                  <div className={s.titulo}><span className={s.tipo}>Remédio</span><h3>{m.nome}</h3><Origem o={m.origem} /></div>
                  <p className={s.meta}>{[m.dose, m.posologia].filter(Boolean).join(', ')}{m.profissionais ? ` · ${m.profissionais.nome} (${m.profissionais.especialidade ?? ''})` : ''}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>
      <p className="aviso-demo" style={{ marginBottom: 32 }}>Demonstração com dados fictícios. Cada registro mostra de onde veio.</p>
    </div>
  )
}
