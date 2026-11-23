import Link from 'next/link'
import { ArrowUpRight, Building2, CalendarCheck2, CheckCircle2, Clock3, HeartPulse, QrCode, ShieldAlert, ShieldCheck, Stethoscope, TriangleAlert, Users } from 'lucide-react'
import { Moldura, Aba } from '@/components/shell/Moldura'
import { Tracos } from '@/components/graficos/Tracos'
import { Assistente } from '@/components/clinica/Assistente'
import { Jornada } from '@/components/clinica/Jornada'
import { exigirProfissional, dossiesDoProfissional, agendaDoConsultorio, consentimentosParaMim, meusAcessos } from '@/lib/profissional'
import { calcularAlertas } from '@/lib/alertas'
import { resumirPaciente } from '@/lib/resumo'
import { hojeSP } from '@/lib/clinica-demo'
import { retrato, iniciais } from '@/lib/retratos'
import { dataBR, idade, registroProf } from '@/lib/formato'
import { navConsultorio } from './nav'
import { irParaQR } from './actions'
import s from '../clinica/clinica.module.css'
import c from './consultorio.module.css'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  confirmado: { rotulo: 'Confirmado', classe: 'pill-ok' }, aguardando: { rotulo: 'Aguardando', classe: 'pill-warn' },
  agendado: { rotulo: 'Agendado', classe: 'pill-neutra' }, atendido: { rotulo: 'Atendido', classe: 'pill-info' },
}

function Foto({ nome, tam = 44 }: { nome: string; tam?: number }) {
  const f = retrato(nome)
  return f ? <img src={f} alt="" width={tam} height={tam} className={s.foto} loading="lazy" /> : <span className={s.fotoIni} style={{ width: tam, height: tam }} aria-hidden="true">{iniciais(nome)}</span>
}

// Consultório do profissional autônomo: carteira própria, agenda do consultório e pacientes que chegam por QR.
export default async function Consultorio({ searchParams }: { searchParams: Promise<{ qr?: string }> }) {
  const { qr } = await searchParams
  const { sb, prof } = await exigirProfissional()
  const [dossies, agenda, consentidos, acessos] = await Promise.all([dossiesDoProfissional(sb, prof.id), agendaDoConsultorio(sb, prof.id), consentimentosParaMim(sb, prof.id), meusAcessos(sb, 6)])
  const comAlertas = dossies.map((d) => ({ d, alertas: calcularAlertas(d) })).sort((a, b) => b.alertas.length - a.alertas.length)
  const todos = comAlertas.flatMap((x) => x.alertas)
  const altos = todos.filter((a) => a.gravidade === 'alta').length
  const alertasPorPac = new Map(comAlertas.map((x) => [x.d.paciente.id, x.alertas]))
  const nomePac = new Map(dossies.map((d) => [d.paciente.id, d.paciente.nome]))
  const atendidas = agenda.filter((a) => a.status === 'atendido' || a.status === 'confirmado').length
  const vencendo = consentidos.filter((k) => new Date(k.fim).getTime() - Date.now() < 7 * 864e5).length
  const focoAg = agenda.find((a) => a.pacienteId && (alertasPorPac.get(a.pacienteId) ?? []).length)
  const focoD = focoAg ? dossies.find((d) => d.paciente.id === focoAg.pacienteId) : comAlertas[0]?.d
  const focoAl = focoD ? alertasPorPac.get(focoD.paciente.id) ?? [] : []
  const h = hojeSP().getHours()
  const ola = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiro = prof.nome.replace(/^Dra?\.\s*/, '').split(' ')[0]
  const titulo = prof.nome.startsWith('Dra') ? 'Dra.' : 'Dr.'
  const nAl = comAlertas.filter((x) => x.alertas.length).length
  const saudacao = `${ola}, ${titulo} ${primeiro}. ${nAl ? `${nAl} ${nAl === 1 ? 'paciente da sua carteira tem' : 'pacientes da sua carteira têm'} alertas.` : 'Nenhum alerta na sua carteira.'}`
  const briefing = comAlertas.filter((x) => x.alertas.length).map((x) => `${x.d.paciente.nome}: ${x.alertas[0].titulo}`)
  const dl = hojeSP().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Moldura nav={navConsultorio(todos.length)} ativo="consultorio" alertas={todos.length} perguntar="#assistente"
      usuario={{ nome: prof.nome, papel: prof.especialidade ?? '', iniciais: iniciais(prof.nome), foto: retrato(prof.nome) }}
      faixa={
        <div className={s.faixa}>
          <div className={s.faixaTxt}>
            <span className={s.eyebrow}>Consultório próprio · {dl.charAt(0).toUpperCase() + dl.slice(1)}</span>
            <h1>Meu consultório</h1>
            <p>Sua carteira de pacientes com o histórico de todos os lugares por onde eles passam, liberado por eles.</p>
          </div>
          <div className={s.chips}>
            <span className={s.chip}>{prof.especialidade} · <strong>{registroProf(prof)}</strong></span>
            {prof.orgs.map((o) => <span key={o.id} className={s.chip}>Também atende em: <strong>{o.nome}</strong></span>)}
            <span className={s.selo}>Dados fictícios de demonstração</span>
          </div>
        </div>
      }
      abas={<>
        <Aba on href="/consultorio" Icone={Stethoscope} titulo="Consultório próprio" sub={`${agenda.length} consultas hoje`} destaque={<><span>Pacientes na carteira</span><strong className="num">{dossies.length}</strong><CheckCircle2 size={16} color="var(--ok)" aria-hidden="true" /></>} />
        {prof.orgs.map((o) => <Aba key={o.id} href="/consultorio#pacientes" Icone={Building2} titulo={o.nome} sub={`${o.cidade} · onde você também atende`} />)}
        <Aba href="/consultorio#receber" Icone={QrCode} titulo="Receber paciente" sub="pelo QR do paciente" />
      </>}>
      <div className={s.grade}>
        <article className={`card ${s.kpi}`}>
          <header><h2><Users size={20} aria-hidden="true" />Carteira</h2><a href="#pacientes" className={s.seta} aria-label="Ver pacientes"><ArrowUpRight size={17} /></a></header>
          <p className={s.kpiSub}>Pacientes que liberaram o histórico para você</p>
          <div className={s.kpiNum}><strong className="num">{dossies.length}</strong><CheckCircle2 size={22} color="var(--ok)" aria-hidden="true" /></div>
          <Tracos fracao={1} rotulos={['Com consentimento ativo', '', String(consentidos.length), '']} />
        </article>
        <article className={`card ${s.kpi}`}>
          <header><h2><CalendarCheck2 size={20} aria-hidden="true" />Consultório hoje</h2><a href="#agenda" className={s.seta} aria-label="Ver agenda"><ArrowUpRight size={17} /></a></header>
          <p className={s.kpiSub}>{agenda.length} consultas marcadas</p>
          <div className={s.kpiNum}><strong className="num">{agenda.length ? Math.round((atendidas / agenda.length) * 100) : 0}%</strong><CheckCircle2 size={22} color="var(--ok)" aria-hidden="true" /></div>
          <Tracos fracao={agenda.length ? atendidas / agenda.length : 0} rotulos={['Confirmadas ou atendidas', 'Pendentes', String(atendidas), String(agenda.length - atendidas)]} />
        </article>
        <article className={`card ${s.kpi}`}>
          <header><h2><ShieldAlert size={20} aria-hidden="true" />Alertas</h2><a href="#pacientes" className={s.seta} aria-label="Ver alertas"><ArrowUpRight size={17} /></a></header>
          <p className={s.kpiSub}>Remédios e diagnósticos vindos de outros lugares</p>
          <div className={s.kpiNum}><strong className="num">{todos.length}</strong><TriangleAlert size={22} color="var(--crit)" aria-hidden="true" /></div>
          <Tracos fracao={todos.length ? altos / todos.length : 0} cor="crit" rotulos={['Altos', 'Para revisar', String(altos), String(todos.length - altos)]} />
        </article>

        {focoD && <div className={s.jornada}><Jornada d={focoD} alertas={focoAl} hora={focoAg?.hora ?? 'hoje'} clinica="Consultório próprio" href={`/consultorio/p/${focoD.paciente.id}`} /></div>}

        <div className={s.assist}><Assistente pacientes={comAlertas.map(({ d }) => resumirPaciente(d))} saudacao={saudacao} briefing={briefing} /></div>

        <article className={`card ${s.agenda} ${c.agenda}`} id="agenda">
          <header><h2><Clock3 size={20} aria-hidden="true" />Agenda do consultório</h2></header>
          <p className={s.kpiSub}>Hoje · {agenda.length} consultas</p>
          <ol className={s.consultas}>
            {agenda.map((a) => {
              const al = a.pacienteId ? alertasPorPac.get(a.pacienteId) ?? [] : []
              const corpo = (<>
                <span className={`${s.hora} num`}>{a.hora}</span><Foto nome={a.nome} />
                <span className={s.cTxt}><strong>{a.nome}</strong><span>{a.detalhe}</span></span>
                <span className={s.cFim}>{al.length > 0 && <span className="pill pill-crit"><TriangleAlert size={12} aria-hidden="true" />alerta</span>}<span className={`pill ${STATUS[a.status]?.classe ?? 'pill-neutra'}`}>{STATUS[a.status]?.rotulo ?? a.status}</span></span>
              </>)
              return <li key={a.id}>{a.pacienteId && nomePac.has(a.pacienteId) ? <Link href={`/consultorio/p/${a.pacienteId}`} className={s.consulta}>{corpo}</Link> : <div className={s.consulta}>{corpo}</div>}</li>
            })}
          </ol>
        </article>

        <section className={`card ${s.antes} ${c.carteira}`} id="pacientes" aria-labelledby="t-cart">
          <header><h2 id="t-cart"><HeartPulse size={20} aria-hidden="true" />Meus pacientes</h2><span className="pill pill-info num">{dossies.length}</span></header>
          <p className={s.kpiSub}>Cada um liberou o acesso para você; o prazo aparece ao lado</p>
          <ul className={s.pacLista}>
            {comAlertas.map(({ d, alertas }) => {
              const k = consentidos.find((x) => x.paciente_id === d.paciente.id)
              return (
                <li key={d.paciente.id}>
                  <Link href={`/consultorio/p/${d.paciente.id}`} className={s.pac}>
                    <Foto nome={d.paciente.nome} tam={48} />
                    <span className={s.pQuem}><strong>{d.paciente.nome}</strong><span>{idade(d.paciente.nascimento)} · {d.atendimentos.length} atendimentos em {new Set(d.atendimentos.map((a) => a.organizacoes?.id)).size} lugares{k ? ` · acesso até ${dataBR(k.fim)}` : ''}</span></span>
                    <span className={s.pTag}>{alertas.length ? <span className="pill pill-crit">{alertas.length} alertas</span> : <span className="pill pill-ok">sem alertas</span>}</span>
                    {alertas[0] && <span className={`${s.pTop} ${alertas[0].gravidade === 'alta' ? s.pAlta : s.pMedia}`}><strong>{alertas[0].titulo}.</strong> {alertas[0].detalhe}</span>}
                  </Link>
                </li>
              )
            })}
            {dossies.length === 0 && <li className={s.vazio}>Nenhum paciente ainda. Peça ao paciente para mostrar o QR do Elo.</li>}
          </ul>
        </section>

        <section className={`card ${s.integ} ${c.receber}`} id="receber" aria-labelledby="t-rec">
          <header><h2 id="t-rec"><QrCode size={20} aria-hidden="true" />Receber paciente pelo QR</h2></header>
          <p className={s.kpiSub}>O paciente gera o QR no app dele e mostra na consulta. Leia com a câmera do celular, ou cole aqui o link ou o código.</p>
          <form action={irParaQR} className={c.form}>
            <label className="sr" htmlFor="codigo">Link ou código do QR</label>
            <input id="codigo" name="codigo" placeholder="Cole o link elosaude.../c/..." autoComplete="off" />
            <button type="submit" className="btn btn-primario">Abrir</button>
          </form>
          {qr === 'invalido' && <p className={c.erro}>Não reconheci esse código. Confira e tente de novo.</p>}
          <h3 className={s.sub}><ShieldCheck size={15} aria-hidden="true" /> Seus acessos registrados</h3>
          <ul className={s.acessos}>
            {acessos.map((a) => <li key={a.id}><Foto nome={a.ator_nome} tam={30} /><span><strong>{a.ator_nome}</strong> {a.acao === 'consentiu' ? 'recebeu acesso ao dossiê de' : a.acao === 'registrou_atendimento' ? 'registrou atendimento de' : 'abriu o dossiê de'} {nomePac.get(a.paciente_id) ?? 'um paciente'}</span><time className="num">{dataBR(a.em).slice(0, 5)}</time></li>)}
          </ul>
          {vencendo > 0 && <p className={c.aviso}>{vencendo} acesso(s) vencem em até 7 dias.</p>}
        </section>
      </div>
    </Moldura>
  )
}
