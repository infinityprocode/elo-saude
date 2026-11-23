import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseServidor } from './supabase/server'
import { carregarDossie, type Dossie } from './dossie'

// Banco v2: tudo do profissional é lido com a SESSÃO dele (chave pública + login). Quem decide o que ele
// pode ver é o banco (RLS + consentimento), não o app. Nada aqui usa a chave de serviço.

export type Org = { id: string; nome: string; cidade: string; tipo: string; rede: string }
export type Profissional = { id: string; nome: string; conselho: string; numero: string; uf: string; especialidade: string | null; orgs: Org[]; autonomo: boolean }

export async function exigirProfissional(): Promise<{ sb: SupabaseClient; prof: Profissional }> {
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/?entrar=1')
  const { data } = await sb.from('profissionais')
    .select('id,nome,conselho,numero,uf,especialidade,atuacoes(ativo,organizacao_id,organizacoes(id,nome,cidade,tipo,rede))')
    .eq('user_id', user.id).maybeSingle()
  if (!data) redirect('/app')
  const at = (data.atuacoes ?? []) as unknown as { ativo: boolean; organizacao_id: string | null; organizacoes: Org | null }[]
  const prof: Profissional = {
    id: data.id, nome: data.nome, conselho: data.conselho, numero: data.numero, uf: data.uf, especialidade: data.especialidade,
    orgs: at.filter((a) => a.ativo && a.organizacoes).map((a) => a.organizacoes!) ,
    autonomo: at.some((a) => a.ativo && !a.organizacao_id),
  }
  return { sb, prof }
}

// Pacientes da carteira da organização. O dossiê só carrega se houver consentimento ativo.
export async function dossiesDaOrg(sb: SupabaseClient, orgId: string): Promise<Dossie[]> {
  const { data } = await sb.from('carteiras').select('paciente_id').eq('organizacao_id', orgId)
  const ids = [...new Set((data ?? []).map((x) => x.paciente_id as string))]
  const ds = await Promise.all(ids.map((id) => carregarDossie(sb, id)))
  return ds.filter(Boolean) as Dossie[]
}

// Abre o dossiê: o banco confere o consentimento e grava o acesso na auditoria, na mesma operação.
export async function abrirDossie(sb: SupabaseClient, pacienteId: string): Promise<Dossie | null> {
  const { data: pode } = await sb.rpc('abrir_dossie', { p: pacienteId })
  if (!pode) return null
  return carregarDossie(sb, pacienteId)
}

export async function meusAcessos(sb: SupabaseClient, limite = 8) {
  const { data } = await sb.from('acessos').select('id,paciente_id,ator_nome,organizacao_nome,acao,em').order('em', { ascending: false }).limit(limite)
  return data ?? []
}

export type Consulta = { id: string; hora: string; nome: string; detalhe: string; profissional: string; profissionalId: string; status: string; pacienteId?: string }

// Agenda do dia da organização (a demonstração traz a agenda para o dia corrente).
export async function agendaDoDia(sb: SupabaseClient, orgId: string): Promise<Consulta[]> {
  await sb.rpc('demo_agenda_do_dia')
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const { data } = await sb.from('agenda')
    .select('id,inicio,paciente_id,paciente_nome,motivo,status,profissional_id,profissionais(nome)')
    .eq('organizacao_id', orgId).gte('inicio', `${hoje}T00:00:00-03:00`).lte('inicio', `${hoje}T23:59:59-03:00`).order('inicio')
  return ((data ?? []) as unknown as { id: string; inicio: string; paciente_id: string | null; paciente_nome: string; motivo: string | null; status: string; profissional_id: string; profissionais: { nome: string } | null }[]).map((a) => ({
    id: a.id, hora: new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
    nome: a.paciente_nome, detalhe: a.motivo ?? '', profissional: a.profissionais?.nome ?? '', profissionalId: a.profissional_id, status: a.status, pacienteId: a.paciente_id ?? undefined,
  }))
}

export async function equipeDaOrg(sb: SupabaseClient, orgId: string) {
  const { data } = await sb.from('atuacoes').select('profissionais(id,nome,especialidade)').eq('organizacao_id', orgId).eq('ativo', true)
  return ((data ?? []) as unknown as { profissionais: { id: string; nome: string; especialidade: string | null } }[]).map((x) => x.profissionais).sort((a, b) => a.nome.localeCompare(b.nome))
}
