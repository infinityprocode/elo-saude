import { notFound } from 'next/navigation'
import { Activity, Clock3, History, LayoutGrid, QrCode, ShieldAlert, ShieldCheck, Siren, UserRound, Building2 } from 'lucide-react'
import { supabaseServidor } from '@/lib/supabase/server'
import { Moldura, Aba, type ItemNav } from '@/components/shell/Moldura'
import { qrSvg, urlPublica } from '@/lib/qr'
import { retrato, iniciais } from '@/lib/retratos'
import { dataBR, horaBR } from '@/lib/formato'
import { criarCompartilhamento, revogar } from './actions'
import s from './compartilhar.module.css'

export const dynamic = 'force-dynamic'

type Consent = { id: string; token: string; escopo: string; inicio: string; fim: string; revogado_em: string | null; profissionais: { nome: string; especialidade: string | null } | null; organizacoes: { nome: string } | null }

export default async function Compartilhar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string; erro?: string; revogado?: string }> }) {
  const { id } = await params
  const { novo, erro, revogado } = await searchParams
  const sb = await supabaseServidor()
  const { data: paciente } = await sb.from('pacientes').select('id,nome').eq('id', id).maybeSingle()
  if (!paciente) notFound()
  const { data: { user } } = await sb.auth.getUser()
  const { data } = await sb.from('consentimentos').select('id,token,escopo,inicio,fim,revogado_em,profissionais(nome,especialidade),organizacoes(nome)').eq('paciente_id', id).order('criado_em', { ascending: false })
  const todos = (data ?? []) as unknown as Consent[]
  const agora = Date.now()
  const ativo = (c: Consent) => !c.revogado_em && new Date(c.fim).getTime() > agora && new Date(c.inicio).getTime() <= agora
  const ativos = todos.filter((c) => c.escopo === 'completo' && ativo(c))
  const emergencia = todos.find((c) => c.escopo === 'emergencia' && ativo(c))
  const recem = novo ? todos.find((c) => c.id === novo && ativo(c) && !c.profissionais && !c.organizacoes) : undefined
  const qrNovo = recem ? await qrSvg(urlPublica(`/c/${recem.token}`)) : null
  const qrEmerg = emergencia ? await qrSvg(urlPublica(`/emergencia/${emergencia.token}`)) : null
  const base = `/app/p/${id}`
  const ehMae = user?.email?.startsWith('marina')
  const quem = ehMae ? 'Marina Souza' : paciente.nome
  const primeiro = paciente.nome.split(' ')[0]
  const nav: ItemNav[] = [
    { k: 'resumo', href: base, rotulo: 'Meu dossiê', Icone: LayoutGrid },
    { k: 'compartilhar', href: `${base}/compartilhar`, rotulo: 'Compartilhar', Icone: QrCode },
    { k: 'linha', href: `${base}#linha`, rotulo: 'Linha do tempo', Icone: History },
    { k: 'acessos', href: `${base}#acessos`, rotulo: 'Acessos', Icone: ShieldCheck },
  ]
  const destino = (c: Consent) => c.profissionais ? `${c.profissionais.nome}${c.profissionais.especialidade ? ` · ${c.profissionais.especialidade}` : ''}` : c.organizacoes ? c.organizacoes.nome : 'QR ainda não usado'
  const restante = (fim: string) => { const h = Math.round((new Date(fim).getTime() - agora) / 3600_000); return h < 1 ? 'menos de 1 hora' : h === 1 ? '1 hora' : h < 48 ? `${h} horas` : `${Math.round(h / 24)} dias` }

  return (
    <Moldura nav={nav} ativo="compartilhar" usuario={{ nome: quem, papel: '', iniciais: iniciais(quem), foto: retrato(quem) }}
      faixa={
        <div className={s.faixa}>
          <span className={s.eyebrow}>{ehMae ? `Dossiê da ${primeiro} · você é a responsável` : 'Meu dossiê de saúde'}</span>
          <h1>Quem pode ver</h1>
          <p>Você decide quem vê o histórico{ehMae ? ` da ${primeiro}` : ''}, por quanto tempo, e pode cancelar a qualquer momento. Cada acesso fica registrado.</p>
        </div>
      }
      abas={<>
        <Aba on href={`${base}/compartilhar`} Icone={QrCode} titulo="Compartilhar" sub="QR com prazo" />
        <Aba href={base} Icone={LayoutGrid} titulo="Meu dossiê" sub="resumo e alertas" />
        <Aba href={`${base}#acessos`} Icone={Activity} titulo="Quem viu" sub="registro de acessos" />
      </>}>
      <div className={s.grade}>
        {erro && <p className={s.erro}>Não deu para concluir. Tente de novo.</p>}
        {revogado && <p className={s.ok}>Acesso cancelado. A partir de agora, quem tinha esse acesso não vê mais o dossiê.</p>}

        <section className={`card ${s.gerar}`} aria-labelledby="t-gerar">
          <header><h2 id="t-gerar"><QrCode size={20} aria-hidden="true" />Mostrar ao médico</h2></header>
          <p className={s.sub}>Gere um QR e mostre na consulta. Quem ler e for profissional de saúde recebe o acesso pelo prazo que você escolher.</p>
          {recem && qrNovo ? (
            <div className={s.qrBox}>
              <div className={s.qr} dangerouslySetInnerHTML={{ __html: qrNovo }} role="img" aria-label="QR de compartilhamento" />
              <div className={s.qrInfo}>
                <strong>Pronto. Mostre este QR ao profissional.</strong>
                <span><Clock3 size={15} aria-hidden="true" />Vale por {restante(recem.fim)}, até {dataBR(recem.fim)} às {horaBR(recem.fim)}.</span>
                <span>Funciona uma vez: depois de lido, fica ligado só a quem leu.</span>
                <a href={`/c/${recem.token}`} className={s.link}>Abrir o link do QR</a>
              </div>
            </div>
          ) : (
            <form action={criarCompartilhamento} className={s.prazos}>
              <input type="hidden" name="paciente" value={id} />
              <fieldset>
                <legend>Por quanto tempo?</legend>
                <label><input type="radio" name="prazo" value="1h" /><span><strong>1 hora</strong><small>só esta consulta</small></span></label>
                <label><input type="radio" name="prazo" value="24h" defaultChecked /><span><strong>24 horas</strong><small>consulta e exames do dia</small></span></label>
                <label><input type="radio" name="prazo" value="7d" /><span><strong>7 dias</strong><small>acompanhamento</small></span></label>
              </fieldset>
              <button type="submit" className="btn btn-primario"><QrCode size={18} aria-hidden="true" />Gerar QR</button>
            </form>
          )}
        </section>

        <section className={`card ${s.lista}`} aria-labelledby="t-ativos">
          <header><h2 id="t-ativos"><ShieldCheck size={20} aria-hidden="true" />Acessos ativos</h2><span className="pill pill-info num">{ativos.length}</span></header>
          {ativos.length === 0 && <p className={s.sub}>Ninguém tem acesso agora.</p>}
          <ul>
            {ativos.map((c) => (
              <li key={c.id}>
                <span className={s.ico} aria-hidden="true">{c.organizacoes ? <Building2 size={18} /> : c.profissionais ? <UserRound size={18} /> : <QrCode size={18} />}</span>
                <span className={s.txt}><strong>{destino(c)}</strong><small>Vale até {dataBR(c.fim)} às {horaBR(c.fim)} · faltam {restante(c.fim)}</small></span>
                <form action={revogar}>
                  <input type="hidden" name="paciente" value={id} />
                  <input type="hidden" name="consentimento" value={c.id} />
                  <button type="submit" className={s.revogar}>Cancelar acesso</button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className={`card ${s.emerg}`} aria-labelledby="t-emerg">
          <header><h2 id="t-emerg"><Siren size={20} aria-hidden="true" />Cartão de emergência</h2></header>
          <p className={s.sub}>Para quando {ehMae ? `a ${primeiro}` : 'você'} não puder autorizar. Quem ler o QR informa nome e motivo e vê só alergias, remédios em uso e doenças crônicas. Você é avisado de cada uso.</p>
          {qrEmerg && emergencia ? (
            <div className={s.qrBox}>
              <div className={`${s.qr} ${s.qrEmerg}`} dangerouslySetInnerHTML={{ __html: qrEmerg }} role="img" aria-label="QR do cartão de emergência" />
              <div className={s.qrInfo}>
                <strong>Salve na tela de bloqueio ou na carteira.</strong>
                <span><ShieldAlert size={15} aria-hidden="true" />Válido até {dataBR(emergencia.fim)}.</span>
                <a href={`/emergencia/${emergencia.token}`} className={s.link}>Ver como o socorrista vê</a>
              </div>
            </div>
          ) : <p className={s.sub}>Cartão de emergência não configurado.</p>}
        </section>
      </div>
    </Moldura>
  )
}
