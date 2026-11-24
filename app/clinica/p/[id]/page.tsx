import { notFound } from 'next/navigation'
import { Activity, History, LayoutGrid, ShieldCheck } from 'lucide-react'
import { Moldura, Aba } from '@/components/shell/Moldura'
import { DossieView } from '@/components/DossieView'
import { SimularLaboratorio } from '@/components/profissional/SimularLaboratorio'
import { emUso } from '@/lib/dossie'
import { AtenderPorVoz } from '@/components/profissional/AtenderPorVoz'
import { ResumoIA } from '@/components/profissional/ResumoIA'
import { FaixaPaciente } from '@/components/FaixaPaciente'
import { exigirProfissional, abrirDossie } from '@/lib/profissional'
import { calcularAlertas } from '@/lib/alertas'
import { retrato, iniciais } from '@/lib/retratos'
import { navClinica } from '../../nav'

export const dynamic = 'force-dynamic'

export default async function DossieNaClinica({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string; lab?: string }> }) {
  const { id } = await params
  const { f = 'tudo', lab } = await searchParams
  const { sb, prof } = await exigirProfissional()
  // o banco confere o consentimento e grava o acesso; sem consentimento, não abre
  const d = await abrirDossie(sb, id)
  if (!d) notFound()
  const alertas = calcularAlertas(d)
  const { data: acessos } = await sb.from('acessos').select('id,ator_nome,organizacao_nome,acao,em').eq('paciente_id', id).order('em', { ascending: false }).limit(10)
  const base = `/clinica/p/${id}`
  return (
    <Moldura nav={navClinica(alertas.length)} ativo="pacientes" alertas={alertas.length} perguntar="/clinica#assistente"
      usuario={{ nome: prof.nome, papel: prof.especialidade ?? '', iniciais: iniciais(prof.nome), foto: retrato(prof.nome) }}
      faixa={<FaixaPaciente d={d} eyebrow={`Dossiê compartilhado com a ${prof.orgs[0]?.nome ?? 'você'} · acesso registrado na auditoria`} />}
      abas={<>
        <Aba on href={`${base}#alertas`} Icone={LayoutGrid} titulo="Antes de atender" sub={`${alertas.length} alertas`} />
        <Aba href={`${base}#linha`} Icone={History} titulo="Linha do tempo" sub={`${d.atendimentos.length} atendimentos`} />
        <Aba href={`${base}#acessos`} Icone={ShieldCheck} titulo="Acessos" sub="quem abriu o dossiê" />
        <Aba href="/clinica" Icone={Activity} titulo="Voltar ao painel" sub="agenda de hoje" />
      </>}>
      <DossieView d={d} f={f} alertas={alertas} acessos={acessos ?? []} modo="profissional" base={base} integracao={<SimularLaboratorio pacienteId={id} voltar={base} lab={lab} />} cabecalho={false}
        ferramentas={<><ResumoIA pacienteId={id} /><AtenderPorVoz pacienteId={id} orgId={prof.orgs[0]?.id} voltar={base} emUso={d.medicamentos.filter((m) => emUso(m)).map((m) => ({ id: m.id, nome: m.nome, principio_ativo: m.principio_ativo }))} /></>} />
    </Moldura>
  )
}
