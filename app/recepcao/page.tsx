import { redirect } from 'next/navigation'
import { CalendarCheck2, EyeOff, UserCheck, UserX, PhoneCall, Undo2, ShieldCheck } from 'lucide-react'
import { Moldura } from '@/components/shell/Moldura'
import { supabaseServidor } from '@/lib/supabase/server'
import { horaBR } from '@/lib/formato'
import { retrato } from '@/lib/retratos'
import { marcar } from './actions'

const n = (q: number, um: string, varios: string) => `${q} ${q === 1 ? um : varios}`
import s from './recepcao.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Recepção · Elo Saúde' }

const ROTULO: Record<string, { t: string; c: string }> = {
  agendado: { t: 'Agendado', c: 'pill-neutra' }, confirmado: { t: 'Confirmado', c: 'pill-ok' }, aguardando: { t: 'Chegou, aguardando', c: 'pill-warn' },
  atendido: { t: 'Atendido', c: 'pill-info' }, faltou: { t: 'Faltou', c: 'pill-crit' }, cancelado: { t: 'Cancelado', c: 'pill-neutra' },
}
type Linha = { id: string; inicio: string; paciente_nome: string; motivo: string | null; status: string; profissionais: { nome: string } | null }

// P-ELO-03: a recepção trabalha a agenda (nome, horário, profissional, status) e NUNCA vê o dossiê.
// Não é só a tela que esconde: as políticas do banco não entregam nada clínico para este papel.
export default async function Recepcao() {
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/?entrar=1')
  const { data: eq } = await sb.from('equipe_org').select('organizacao_id, papel, organizacoes(nome)').eq('user_id', user.id).eq('ativo', true).eq('papel', 'recepcao').limit(1).maybeSingle()
  if (!eq) redirect('/app')
  await sb.rpc('demo_agenda_do_dia')
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const { data } = await sb.from('agenda').select('id, inicio, paciente_nome, motivo, status, profissionais(nome)')
    .eq('organizacao_id', eq.organizacao_id).gte('inicio', `${hoje}T00:00:00-03:00`).lte('inicio', `${hoje}T23:59:59-03:00`).order('inicio')
  const agenda = (data ?? []) as unknown as Linha[]
  const nomeOrg = (eq.organizacoes as unknown as { nome: string } | null)?.nome ?? 'Clínica'
  const nome = (user.user_metadata?.nome as string) ?? 'Recepção'
  const conta = (st: string) => agenda.filter((a) => a.status === st).length
  return (
    <Moldura nav={[{ k: 'agenda', href: '/recepcao', rotulo: 'Agenda do dia', Icone: CalendarCheck2 }, { k: 'seguranca', href: '/conta/seguranca', rotulo: 'Segurança da conta', Icone: ShieldCheck }]} ativo="agenda"
      usuario={{ nome, papel: `Recepção · ${nomeOrg}`, iniciais: nome.split(' ').map((x) => x[0]).slice(0, 2).join(''), foto: retrato(nome) }}
      faixa={<div className={s.faixa}><span className={s.eyebrow}>{nomeOrg} · recepção</span><h1>Agenda de hoje</h1>
        <p>{agenda.length} consultas · {n(conta('confirmado') + conta('aguardando') + conta('atendido'), 'confirmada', 'confirmadas')} · {conta('aguardando')} na sala de espera · {n(conta('faltou'), 'falta', 'faltas')}</p></div>}>
      <div className={s.pagina}>
        <p className={s.privacidade}><EyeOff size={16} aria-hidden="true" />A recepção vê nome, horário e profissional. Alergias, remédios e histórico ficam só com quem atende, e o banco não entrega esses dados para este acesso.</p>
        {agenda.length === 0 && <p className={s.vazio}>Nenhuma consulta para hoje.</p>}
        <ol className={s.lista}>
          {agenda.map((a) => {
            const r = ROTULO[a.status] ?? ROTULO.agendado
            const botao = (status: string, rotulo: string, Icone: typeof UserCheck) => (
              <form action={marcar}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value={status} />
                <button type="submit" className={s.acao}><Icone size={16} aria-hidden="true" />{rotulo}</button></form>
            )
            return (
              <li key={a.id} className={`card ${s.linha}`}>
                <time className={s.hora}>{horaBR(a.inicio)}</time>
                <div className={s.quem}><strong>{a.paciente_nome}</strong><span>{a.profissionais?.nome ?? ''}{a.motivo ? ` · ${a.motivo}` : ''}</span></div>
                <span className={`pill ${r.c}`}>{r.t}</span>
                <div className={s.acoes}>
                  {a.status === 'agendado' && botao('confirmado', 'Confirmou', PhoneCall)}
                  {['agendado', 'confirmado'].includes(a.status) && botao('aguardando', 'Chegou', UserCheck)}
                  {['agendado', 'confirmado'].includes(a.status) && botao('faltou', 'Faltou', UserX)}
                  {['aguardando', 'faltou'].includes(a.status) && botao('confirmado', 'Desfazer', Undo2)}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </Moldura>
  )
}
