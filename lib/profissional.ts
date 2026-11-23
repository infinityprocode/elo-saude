import { redirect } from 'next/navigation'
import { supabaseServidor } from './supabase/server'
import { supabaseAdmin } from './supabase/admin'
import { carregarDossie, type Dossie } from './dossie'

export type Profissional = { id: string; nome: string; conselho: string; registro: string; especialidade: string | null; organizacao_id: string; organizacoes: { id: string; nome: string; cidade: string } }

// Garante que quem está logado é um profissional; senão, volta para a entrada.
export async function exigirProfissional(): Promise<Profissional> {
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/?entrar=1')
  const { data } = await supabaseAdmin().from('profissionais').select('id,nome,conselho,registro,especialidade,organizacao_id,organizacoes(id,nome,cidade)').eq('user_id', user.id).maybeSingle()
  if (!data) redirect('/app')
  return data as unknown as Profissional
}

// Pacientes que a clínica pode ver: compartilhamento ativo com a unidade.
export async function pacientesDaClinica(orgId: string): Promise<string[]> {
  const { data } = await supabaseAdmin().from('compartilhamentos').select('paciente_id').eq('organizacao_id', orgId).is('revogado_em', null).gt('expira_em', new Date().toISOString())
  return [...new Set((data ?? []).map((x) => x.paciente_id as string))]
}

export async function dossieParaClinica(orgId: string, pacienteId: string): Promise<Dossie | null> {
  const ids = await pacientesDaClinica(orgId)
  if (!ids.includes(pacienteId)) return null
  return carregarDossie(supabaseAdmin(), pacienteId)
}

export async function acessosRecentes(pacienteIds: string[]) {
  if (!pacienteIds.length) return []
  const { data } = await supabaseAdmin().from('acessos').select('id,paciente_id,quem,organizacao,acao,em').in('paciente_id', pacienteIds).order('em', { ascending: false }).limit(8)
  return data ?? []
}
