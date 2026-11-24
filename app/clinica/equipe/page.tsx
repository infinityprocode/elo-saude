import { redirect } from 'next/navigation'
import { Users, CalendarCheck2, EyeOff, ShieldCheck, Stethoscope, KeyRound } from 'lucide-react'
import { Moldura } from '@/components/shell/Moldura'
import { supabaseServidor } from '@/lib/supabase/server'
import { retrato } from '@/lib/retratos'
import s from './equipe.module.css'

export const dynamic = 'force-dynamic'
const n = (q: number, um: string, varios: string) => `${q} ${q === 1 ? um : varios}`
export const metadata = { title: 'Equipe · Elo Saúde' }

type Painel = {
  organizacao: { nome: string; cidade: string } | null
  profissionais: { nome: string; registro: string; especialidade: string | null; desde: string; consultas_hoje: number; atendidas_hoje: number }[]
  equipe: { papel: string; nome: string }[]
  hoje: { consultas: number; confirmadas: number; atendidas: number; faltas: number }
  semana: { consultas: number; faltas: number }
  consentimentos_ativos: number
  acessos_7d: number
}

// P-ELO-03: o gestor vê a operação e a equipe, em números. Nenhum nome de paciente, nenhum dado clínico:
// tudo vem da função painel_gestor (migração 009), que confere o papel de gestor no banco.
export default async function Equipe() {
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/?entrar=1')
  const { data: eq } = await sb.from('equipe_org').select('organizacao_id').eq('user_id', user.id).eq('papel', 'gestor').eq('ativo', true).limit(1).maybeSingle()
  if (!eq) redirect('/app')
  await sb.rpc('demo_agenda_do_dia')
  const { data, error } = await sb.rpc('painel_gestor', { org: eq.organizacao_id })
  if (error || !data) redirect('/app')
  const p = data as Painel
  const nome = (user.user_metadata?.nome as string) ?? 'Gestor'
  const taxaFalta = p.semana.consultas ? Math.round((p.semana.faltas / p.semana.consultas) * 100) : 0
  const kpis = [
    { rot: 'Consultas hoje', val: p.hoje.consultas, sub: `${n(p.hoje.confirmadas, 'confirmada', 'confirmadas')} · ${n(p.hoje.atendidas, 'atendida', 'atendidas')}`, Icone: CalendarCheck2 },
    { rot: 'Faltas na semana', val: `${taxaFalta}%`, sub: `${n(p.semana.faltas, 'falta', 'faltas')} em ${n(p.semana.consultas, 'consulta', 'consultas')}`, Icone: CalendarCheck2 },
    { rot: 'Pacientes que liberaram o histórico', val: p.consentimentos_ativos, sub: 'consentimentos ativos para a clínica', Icone: ShieldCheck },
    { rot: 'Dossiês abertos pela equipe', val: p.acessos_7d, sub: 'nos últimos 7 dias, todos auditados', Icone: Stethoscope },
  ]
  return (
    <Moldura nav={[{ k: 'equipe', href: '/clinica/equipe', rotulo: 'Equipe e operação', Icone: Users }, { k: 'seguranca', href: '/conta/seguranca', rotulo: 'Segurança da conta', Icone: KeyRound }]} ativo="equipe"
      usuario={{ nome, papel: `Gestor · ${p.organizacao?.nome ?? ''}`, iniciais: nome.split(' ').map((x) => x[0]).slice(0, 2).join(''), foto: retrato(nome) }}
      faixa={<div className={s.faixa}><span className={s.eyebrow}>{p.organizacao?.nome} · {p.organizacao?.cidade} · gestão</span><h1>Equipe e operação</h1>
        <p>{p.profissionais.length} profissionais · {p.equipe.length} na equipe de apoio</p></div>}>
      <div className={s.pagina}>
        <p className={s.privacidade}><EyeOff size={16} aria-hidden="true" />A gestão vê a operação em números. Nome de paciente, diagnóstico e remédio não aparecem aqui: o banco só entrega totais para este papel.</p>
        <section className={s.kpis} aria-label="Indicadores">
          {kpis.map(({ rot, val, sub, Icone }) => (
            <article key={rot} className={`card ${s.kpi}`}><Icone size={18} aria-hidden="true" /><small>{rot}</small><strong>{val}</strong><span>{sub}</span></article>
          ))}
        </section>
        <section className={`card ${s.bloco}`} aria-labelledby="t-prof">
          <h2 id="t-prof">Profissionais</h2>
          <ul className={s.tabela}>
            {p.profissionais.map((x) => (
              <li key={x.registro}>
                <div><strong>{x.nome}</strong><span>{x.especialidade ?? 'Clínico'} · {x.registro}</span></div>
                <span className={s.num}><span>{x.atendidas_hoje} de {x.consultas_hoje}</span><small>atendidas hoje</small></span>
              </li>
            ))}
          </ul>
        </section>
        <section className={`card ${s.bloco}`} aria-labelledby="t-apoio">
          <h2 id="t-apoio">Equipe de apoio</h2>
          <ul className={s.tabela}>
            {p.equipe.map((x, i) => (
              <li key={i}><div><strong>{x.nome}</strong><span>{x.papel === 'recepcao' ? 'Recepção: agenda e chegada, sem acesso clínico' : 'Gestão: números da operação, sem acesso clínico'}</span></div></li>
            ))}
          </ul>
        </section>
      </div>
    </Moldura>
  )
}
