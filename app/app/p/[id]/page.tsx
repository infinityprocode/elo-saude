import { notFound } from 'next/navigation'
import { Activity, History, LayoutGrid, ShieldCheck } from 'lucide-react'
import { supabaseServidor } from '@/lib/supabase/server'
import { carregarDossie } from '@/lib/dossie'
import { calcularAlertas } from '@/lib/alertas'
import { Moldura, Aba, type ItemNav } from '@/components/shell/Moldura'
import { DossieView } from '@/components/DossieView'
import { FaixaPaciente } from '@/components/FaixaPaciente'
import { retrato, iniciais } from '@/lib/retratos'

export const dynamic = 'force-dynamic'

export default async function DossiePaciente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string }> }) {
  const { id } = await params
  const { f = 'tudo' } = await searchParams
  const sb = await supabaseServidor()
  const d = await carregarDossie(sb, id)
  if (!d) notFound()
  const { data: acessos } = await sb.from('acessos').select('id,ator_nome,organizacao_nome,acao,em').eq('paciente_id', id).order('em', { ascending: false }).limit(10)
  const { data: { user } } = await sb.auth.getUser()
  const alertas = calcularAlertas(d)
  const base = `/app/p/${id}`
  const nav: ItemNav[] = [
    { k: 'resumo', href: base, rotulo: 'Meu dossiê', Icone: LayoutGrid },
    { k: 'alertas', href: `${base}#alertas`, rotulo: 'Alertas', Icone: Activity, badge: alertas.length || undefined },
    { k: 'linha', href: `${base}#linha`, rotulo: 'Linha do tempo', Icone: History },
    { k: 'acessos', href: `${base}#acessos`, rotulo: 'Acessos', Icone: ShieldCheck },
  ]
  const ehMae = user?.email?.startsWith('marina')
  const quem = ehMae ? 'Marina Souza' : d.paciente.nome
  return (
    <Moldura nav={nav} ativo="resumo" alertas={alertas.length} usuario={{ nome: quem, papel: ehMae ? 'Responsável pela Lívia' : 'Titular', iniciais: iniciais(quem), foto: retrato(quem) }}
      faixa={<FaixaPaciente d={d} eyebrow={ehMae ? 'Dossiê da Lívia · você é a responsável' : 'Meu dossiê de saúde'} />}
      abas={<>
        <Aba on href={base} Icone={LayoutGrid} titulo="Resumo" sub="alergias, remédios, condições" />
        <Aba href={`${base}#linha`} Icone={History} titulo="Linha do tempo" sub={`${d.atendimentos.length} atendimentos`} />
        <Aba href={`${base}#acessos`} Icone={ShieldCheck} titulo="Quem viu" sub={`${(acessos ?? []).length} acessos`} />
      </>}>
      <DossieView d={d} f={f} alertas={alertas} acessos={acessos ?? []} modo="paciente" base={base} cabecalho={false} />
    </Moldura>
  )
}
