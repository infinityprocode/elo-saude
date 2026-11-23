import { notFound } from 'next/navigation'
import { Activity, History, LayoutGrid, ShieldCheck } from 'lucide-react'
import { Moldura, Aba } from '@/components/shell/Moldura'
import { DossieView } from '@/components/DossieView'
import { FaixaPaciente } from '@/components/FaixaPaciente'
import { exigirProfissional, dossieParaClinica, acessosRecentes } from '@/lib/profissional'
import { calcularAlertas } from '@/lib/alertas'
import { retrato, iniciais } from '@/lib/retratos'
import { navClinica } from '../../nav'

export const dynamic = 'force-dynamic'

export default async function DossieNaClinica({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string }> }) {
  const { id } = await params
  const { f = 'tudo' } = await searchParams
  const prof = await exigirProfissional()
  const d = await dossieParaClinica(prof.organizacao_id, id)
  if (!d) notFound()
  const alertas = calcularAlertas(d)
  const acessos = await acessosRecentes([id])
  const base = `/clinica/p/${id}`
  return (
    <Moldura nav={navClinica(alertas.length)} ativo="pacientes" alertas={alertas.length} perguntar="/clinica#assistente"
      usuario={{ nome: prof.nome, papel: prof.especialidade ?? '', iniciais: iniciais(prof.nome), foto: retrato(prof.nome) }}
      faixa={<FaixaPaciente d={d} eyebrow={`Dossiê compartilhado com a ${prof.organizacoes.nome} · válido até 31/12/2026`} />}
      abas={<>
        <Aba on href={`${base}#alertas`} Icone={LayoutGrid} titulo="Antes de atender" sub={`${alertas.length} alertas`} />
        <Aba href={`${base}#linha`} Icone={History} titulo="Linha do tempo" sub={`${d.atendimentos.length} atendimentos`} />
        <Aba href={`${base}#acessos`} Icone={ShieldCheck} titulo="Acessos" sub="quem abriu o dossiê" />
        <Aba href="/clinica" Icone={Activity} titulo="Voltar ao painel" sub="agenda de hoje" />
      </>}>
      <DossieView d={d} f={f} alertas={alertas} acessos={acessos as never} modo="profissional" base={base} cabecalho={false} />
    </Moldura>
  )
}
