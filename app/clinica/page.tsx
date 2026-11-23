import Link from 'next/link'
import { ArrowUpRight, CalendarCheck2, CheckCircle2, FileScan, HeartPulse, LayoutGrid, Network, ShieldAlert, Stethoscope, TriangleAlert, UserRound } from 'lucide-react'
import { Moldura, Aba } from '@/components/shell/Moldura'
import { Tracos } from '@/components/graficos/Tracos'
import { Barras } from '@/components/graficos/Barras'
import { Assistente } from '@/components/clinica/Assistente'
import { exigirProfissional, pacientesDaClinica, dossieParaClinica, acessosRecentes } from '@/lib/profissional'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calcularAlertas } from '@/lib/alertas'
import { resumirPaciente } from '@/lib/resumo'
import { indicadores, agendaHoje, hojeSP } from '@/lib/clinica-demo'
import { retrato, iniciais } from '@/lib/retratos'
import { dataBR, idade } from '@/lib/formato'
import type { Dossie } from '@/lib/dossie'
import { navClinica } from './nav'
import s from './clinica.module.css'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  confirmado: { rotulo: 'Confirmado', classe: 'pill-ok' }, aguardando: { rotulo: 'Aguardando', classe: 'pill-warn' },
  agendado: { rotulo: 'Agendado', classe: 'pill-neutra' }, atendido: { rotulo: 'Atendido', classe: 'pill-info' },
}
const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0)
const br = (n: number, d = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

function Foto({ nome, tam = 44 }: { nome: string; tam?: number }) {
  const f = retrato(nome)
  return f
    ? <img src={f} alt="" width={tam} height={tam} className={s.foto} loading="lazy" />
    : <span className={s.fotoIni} style={{ width: tam, height: tam }} aria-hidden="true">{iniciais(nome)}</span>
}

export default async function PainelClinica({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  const { q = '', p: filtroProf = '' } = await searchParams
  const busca = sem(q.trim())
  const casa = (t: string) => !busca || sem(t).includes(busca)
  const prof = await exigirProfissional()
  const org = prof.organizacoes
  const { data: equipe } = await supabaseAdmin().from('profissionais').select('id,nome,especialidade').eq('organizacao_id', prof.organizacao_id).order('nome')

  const ids = await pacientesDaClinica(prof.organizacao_id)
  const dossies = (await Promise.all(ids.map((id) => dossieParaClinica(prof.organizacao_id, id)))).filter(Boolean) as Dossie[]
  const comAlertas = dossies.map((d) => ({ d, alertas: calcularAlertas(d) })).sort((a, b) => b.alertas.filter((x) => x.gravidade === 'alta').length - a.alertas.filter((x) => x.gravidade === 'alta').length)
  const todos = comAlertas.flatMap((x) => x.alertas)
  const altos = todos.filter((a) => a.gravidade === 'alta').length
  const resumos = comAlertas.map(({ d }) => resumirPaciente(d))
  const alertasPorPac = new Map(comAlertas.map((x) => [x.d.paciente.id, x.alertas]))
  const { serie } = indicadores()
  const agendaToda = agendaHoje()
  const profSel = (equipe ?? []).find((e) => e.id === filtroProf)
  const agenda = agendaToda.filter((c) => (!profSel || c.profissional === profSel.nome) && casa(`${c.nome} ${c.detalhe}`))
  const acessos = await acessosRecentes(ids)
  const nomePac = new Map(dossies.map((d) => [d.paciente.id, d.paciente.nome]))

  const confirmadas = agenda.filter((c) => c.status === 'confirmado' || c.status === 'atendido').length
  const total30 = serie.reduce((a, p) => a + p.v, 0)
  const abertos = serie.filter((p) => p.v > 0)
  const media = abertos.reduce((a, p) => a + p.v, 0) / Math.max(abertos.length, 1)
  const pico = serie.reduce((m, p) => (p.v > m.v ? p : m), serie[0])
  const sabados = serie.filter((p) => new Date(p.data + 'T12:00:00-03:00').getDay() === 6)

  const chegou = dossies.flatMap((d) => [
    ...d.exames.filter((e) => e.resultado_em).map((e) => ({ id: e.id, quando: e.resultado_em!, titulo: `Resultado: ${e.nome}`, quem: d.paciente.nome, pid: d.paciente.id, origem: e.origem, de: e.organizacoes?.nome ?? '', rede: e.organizacoes?.tipo })),
    ...d.atendimentos.filter((a) => a.origem !== 'profissional').map((a) => ({ id: a.id, quando: a.data, titulo: `Atendimento: ${a.hipotese ?? a.tipo}`, quem: d.paciente.nome, pid: d.paciente.id, origem: a.origem, de: a.organizacoes?.nome ?? '', rede: a.organizacoes?.tipo })),
  ].filter((c) => casa(`${c.quem} ${c.titulo}`))).sort((a, b) => (a.quando < b.quando ? 1 : -1)).slice(0, 6)

  const fontes = new Map<string, number>()
  for (const d of dossies) for (const r of [...d.exames, ...d.atendimentos]) if (r.origem === 'integracao_fhir' && r.organizacoes) fontes.set(r.organizacoes.nome, (fontes.get(r.organizacoes.nome) ?? 0) + 1)
  const totalFhir = [...fontes.values()].reduce((a, b) => a + b, 0)

  const hoje = hojeSP()
  const dl = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  const h = hoje.getHours()
  const ola = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiro = prof.nome.replace(/^Dra?\.\s*/, '').split(' ')[0]
  const titulo = prof.nome.startsWith('Dra') ? 'Dra.' : 'Dr.'
  const comAlertaHoje = agendaToda.filter((c) => c.pacienteId && (alertasPorPac.get(c.pacienteId) ?? []).some((a) => a.gravidade === 'alta'))
  const saudacao = `${ola}, ${titulo} ${primeiro}. ${comAlertaHoje.length ? `${comAlertaHoje.length} pacientes da agenda de hoje têm alertas altos: ${comAlertaHoje.map((c) => `${c.nome.split(' ')[0]} (${c.hora})`).join(' e ')}. Quer começar por qual?` : 'Nenhum paciente da agenda de hoje tem alerta alto.'}`

  const ocupacao = (nome?: string) => { const l = agendaToda.filter((c) => !nome || c.profissional === nome); return pct(l.filter((c) => c.status !== 'agendado').length, l.length) }

  return (
    <Moldura nav={navClinica(todos.length)} ativo="painel" alertas={todos.length} perguntar="#assistente"
      usuario={{ nome: prof.nome, papel: prof.especialidade ?? '', iniciais: iniciais(prof.nome), foto: retrato(prof.nome) }}
      faixa={
        <div className={s.faixa}>
          <div className={s.faixaTxt}>
            <span className={s.eyebrow}>{org.nome} · {dl.charAt(0).toUpperCase() + dl.slice(1)}</span>
            <h1>Painel da clínica</h1>
            <p>Quem chega hoje, o que mudou no histórico de cada paciente e o que merece atenção antes da consulta.</p>
          </div>
          <div className={s.chips}>
            <span className={s.chip}>Unidade: <strong>{org.nome}</strong></span>
            <span className={s.chip}>Equipe: <strong>{(equipe ?? []).length} profissionais</strong></span>
            <span className={s.chip}>Integração: <strong className={s.verde}>Ativa</strong></span>
            <span className={s.selo}>Dados fictícios de demonstração</span>
          </div>
        </div>
      }
      abas={<>
        <Aba on={!profSel} href="/clinica" Icone={LayoutGrid} titulo="Toda a clínica" sub={`${agendaToda.length} consultas hoje`} destaque={<><span>Agenda ocupada</span><strong className="num">{br(ocupacao())}%</strong><CheckCircle2 size={16} color="var(--ok)" aria-hidden="true" /></>} />
        {(equipe ?? []).map((e) => (
          <Aba key={e.id} on={profSel?.id === e.id} href={`/clinica?p=${e.id}`} Icone={e.especialidade?.startsWith('Orto') ? Stethoscope : UserRound} titulo={e.nome} sub={`${e.especialidade} · ${agendaToda.filter((c) => c.profissional === e.nome).length} hoje`}
            destaque={<><span>Agenda ocupada</span><strong className="num">{br(ocupacao(e.nome))}%</strong><CheckCircle2 size={16} color="var(--ok)" aria-hidden="true" /></>} />
        ))}
        <Aba href="/clinica#integracoes" Icone={Network} titulo="Rede conectada" sub={`${fontes.size} unidades de origem`} />
      </>}>
      <div className={s.grade}>
        <form className={s.busca} action="/clinica" role="search" id="busca">
          {profSel && <input type="hidden" name="p" value={profSel.id} />}
          <label className="sr" htmlFor="q">Buscar paciente, exame ou remédio</label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar paciente, exame ou remédio..." autoComplete="off" />
        </form>

        <article className={`card ${s.kpi} entra`} style={{ ['--i' as string]: 0 }}>
          <header><h2><CalendarCheck2 size={20} aria-hidden="true" />Agenda de hoje</h2><a href="#agenda" className={s.seta} aria-label="Ver agenda"><ArrowUpRight size={17} /></a></header>
          <p className={s.kpiSub}>{profSel ? profSel.nome : 'Toda a clínica'} · {agenda.length} consultas</p>
          <div className={s.kpiNum}><strong className="num">{br(pct(confirmadas, agenda.length))}%</strong><CheckCircle2 size={22} color="var(--ok)" aria-hidden="true" /></div>
          <Tracos fracao={confirmadas / Math.max(agenda.length, 1)} rotulos={['Confirmadas', 'A confirmar', String(confirmadas), String(agenda.length - confirmadas)]} />
        </article>

        <article className={`card ${s.kpi} entra`} style={{ ['--i' as string]: 1 }}>
          <header><h2><HeartPulse size={20} aria-hidden="true" />Chegam com histórico</h2><a href="#chegou" className={s.seta} aria-label="Ver documentos"><ArrowUpRight size={17} /></a></header>
          <p className={s.kpiSub}>Pacientes ativos com dossiê no Elo</p>
          <div className={s.kpiNum}><strong className="num">78,4%</strong><CheckCircle2 size={22} color="var(--ok)" aria-hidden="true" /></div>
          <Tracos fracao={0.784} rotulos={['Com dossiê', 'Sem dossiê', '1.000', '276']} />
        </article>

        <article className={`card ${s.kpi} entra`} style={{ ['--i' as string]: 2 }}>
          <header><h2><ShieldAlert size={20} aria-hidden="true" />Alertas clínicos</h2><a href="#pacientes" className={s.seta} aria-label="Ver alertas"><ArrowUpRight size={17} /></a></header>
          <p className={s.kpiSub}>Nos {dossies.length} dossiês compartilhados com a clínica</p>
          <div className={s.kpiNum}><strong className="num">{todos.length}</strong><TriangleAlert size={22} color="var(--crit)" aria-hidden="true" /></div>
          <Tracos fracao={altos / Math.max(todos.length, 1)} cor="crit" rotulos={['Altos', 'Para revisar', String(altos), String(todos.length - altos)]} />
        </article>

        <div className={`${s.assist} entra`} style={{ ['--i' as string]: 3 }}><Assistente pacientes={resumos} saudacao={saudacao} /></div>

        <article className={`card ${s.fluxo} entra`} style={{ ['--i' as string]: 4 }}>
          <header><h2><UserRound size={20} aria-hidden="true" />Fluxo de pacientes</h2><span className={s.seta} aria-hidden="true"><ArrowUpRight size={17} /></span></header>
          <p className={s.kpiSub}>Últimos 30 dias · toda a clínica</p>
          <div className={s.fluxoTopo}>
            <div className={s.fluxoNum}><strong className="num">{total30.toLocaleString('pt-BR')}</strong><span className="pill pill-ok">atendimentos</span></div>
            <dl className={s.mini}>
              <div><dt className="num">{br(media)}</dt><dd>por dia aberto</dd></div>
              <div><dt className="num">{pico.v}</dt><dd>pico, {dataBR(pico.data).slice(0, 5)}</dd></div>
              <div><dt className="num">{sabados.length ? Math.round(sabados.reduce((a, p) => a + p.v, 0) / sabados.length) : 0}</dt><dd>média aos sábados</dd></div>
              <div><dt className="num">{serie[serie.length - 1].v}</dt><dd>hoje</dd></div>
            </dl>
          </div>
          <Barras serie={serie} />
          <p className={s.legenda}><span className={s.lVerde} />dia útil <span className={s.lAmbar} />sábado <span className={s.lCinza} />domingo, fechado</p>
        </article>

        <article className={`card ${s.agenda} entra`} style={{ ['--i' as string]: 5 }} id="agenda">
          <header><h2><CalendarCheck2 size={20} aria-hidden="true" />Consultas de hoje</h2><span className={s.seta} aria-hidden="true"><ArrowUpRight size={17} /></span></header>
          <p className={s.kpiSub}>{agenda.length} marcadas · {agenda.filter((c) => c.status === 'atendido').length} atendidas</p>
          <ol className={s.consultas}>
            {agenda.map((c) => {
              const al = c.pacienteId ? alertasPorPac.get(c.pacienteId) ?? [] : []
              const corpo = (<>
                <span className={`${s.hora} num`}>{c.hora}</span>
                <Foto nome={c.nome} />
                <span className={s.cTxt}><strong>{c.nome}</strong><span>{c.detalhe}</span></span>
                <span className={s.cFim}>{al.some((a) => a.gravidade === 'alta') && <span className="pill pill-crit"><TriangleAlert size={12} aria-hidden="true" />alerta</span>}<span className={`pill ${STATUS[c.status].classe}`}>{STATUS[c.status].rotulo}</span></span>
              </>)
              return <li key={c.hora}>{c.pacienteId ? <Link href={`/clinica/p/${c.pacienteId}`} className={s.consulta}>{corpo}</Link> : <div className={s.consulta}>{corpo}</div>}</li>
            })}
            {agenda.length === 0 && <li className={s.vazio}>Nenhuma consulta com esse filtro.</li>}
          </ol>
        </article>

        <section className={`card ${s.antes} entra`} style={{ ['--i' as string]: 6 }} id="pacientes" aria-labelledby="t-antes">
          <header><h2 id="t-antes"><ShieldAlert size={20} aria-hidden="true" />Antes da consulta</h2><span className="pill pill-crit num">{todos.length} alertas</span></header>
          <p className={s.kpiSub}>Dossiês compartilhados com a clínica e o que cada um pede de atenção</p>
          <ul className={s.pacLista}>
            {comAlertas.filter(({ d }) => casa(`${d.paciente.nome} ${d.condicoes.map((c) => c.descricao).join(' ')} ${d.medicamentos.map((m) => m.nome).join(' ')}`)).map(({ d, alertas }) => {
              const nAltos = alertas.filter((a) => a.gravidade === 'alta').length
              const lugares = new Set(d.atendimentos.map((a) => a.organizacoes?.id)).size
              return (
                <li key={d.paciente.id}>
                  <Link href={`/clinica/p/${d.paciente.id}`} className={s.pac}>
                    <Foto nome={d.paciente.nome} tam={48} />
                    <span className={s.pQuem}><strong>{d.paciente.nome}</strong><span>{idade(d.paciente.nascimento)}{d.paciente.gestante ? ' · gestante' : ''} · {d.atendimentos.length} atendimentos em {lugares} {lugares === 1 ? 'lugar' : 'lugares'}</span></span>
                    <span className={s.pTag}>{nAltos ? <span className="pill pill-crit">{nAltos} {nAltos === 1 ? 'alto' : 'altos'}</span> : alertas.length ? <span className="pill pill-warn">{alertas.length} para revisar</span> : <span className="pill pill-ok"><CheckCircle2 size={12} aria-hidden="true" />sem alertas</span>}</span>
                    {alertas[0] && <span className={`${s.pTop} ${alertas[0].gravidade === 'alta' ? s.pAlta : s.pMedia}`}><strong>{alertas[0].titulo}.</strong> {alertas[0].detalhe}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={`card ${s.integ} entra`} style={{ ['--i' as string]: 7 }} id="integracoes" aria-labelledby="t-integ">
          <header><h2 id="t-integ"><Network size={20} aria-hidden="true" />Rede conectada</h2><span className="pill pill-ok"><span className={s.vivo} aria-hidden="true" />ativa</span></header>
          <p className={s.kpiSub}>Registros recebidos no padrão FHIR (simulado na demonstração)</p>
          <ul className={s.fontes}>
            {[...fontes.entries()].sort((a, b) => b[1] - a[1]).map(([o, n]) => (
              <li key={o}><span>{o}</span><Tracos fracao={n / Math.max(totalFhir, 1)} cor="cobalt" n={24} /><strong className="num">{n}</strong></li>
            ))}
          </ul>
          <h3 className={s.sub}>Quem abriu os dossiês</h3>
          <ul className={s.acessos}>
            {acessos.map((a) => (
              <li key={a.id}><Foto nome={a.quem} tam={30} /><span><strong>{a.quem}</strong> {a.acao === 'registrou_atendimento' ? 'registrou atendimento de' : 'abriu o dossiê de'} {nomePac.get(a.paciente_id)}</span><time className="num">{dataBR(a.em).slice(0, 5)}</time></li>
            ))}
          </ul>
        </section>

        <section className={`card ${s.chegou} entra`} style={{ ['--i' as string]: 8 }} id="chegou" aria-labelledby="t-chegou">
          <header><h2 id="t-chegou"><FileScan size={20} aria-hidden="true" />Chegou no dossiê</h2></header>
          <p className={s.kpiSub}>O que entrou por foto do paciente ou pela rede, sem ninguém digitar</p>
          <ol className={s.feed}>
            {chegou.map((c) => (
              <li key={c.id}>
                <span className={`${s.feedIco} ${c.origem === 'paciente_foto' ? s.fFoto : s.fFhir}`} aria-hidden="true">{c.origem === 'paciente_foto' ? <FileScan size={17} /> : <Network size={17} />}</span>
                <span className={s.feedTxt}><Link href={`/clinica/p/${c.pid}`}>{c.titulo}</Link><span>{c.quem} · {c.de}</span></span>
                <span className={s.feedFim}><span className={`pill ${c.origem === 'paciente_foto' ? 'or-foto' : 'or-fhir'}`}>{c.origem === 'paciente_foto' ? 'Foto lida' : 'FHIR'}</span><time className="num">{dataBR(c.quando)}</time></span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Moldura>
  )
}
