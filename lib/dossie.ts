import type { SupabaseClient } from '@supabase/supabase-js'

export type Org = { id: string; nome: string; tipo: string; rede: 'publica' | 'privada'; cidade: string }
export type Prof = { id: string; nome: string; conselho: string; numero: string; uf: string; especialidade: string | null }
export type Paciente = { id: string; nome: string; nascimento: string; sexo: string | null; peso_kg: number | null; tipo_sanguineo: string | null; cidade: string | null; contato_emergencia: string | null; gestante: boolean }
export type Atendimento = { id: string; data: string; tipo: string; rede: 'sus' | 'particular' | 'convenio'; operadora: string | null; local_texto: string | null; profissional_texto: string | null; queixa: string | null; hipotese: string | null; conduta: string | null; origem: string; organizacoes: Org | null; profissionais: Prof | null }
export type Condicao = { id: string; descricao: string; cid10: string | null; status: string; cronica: boolean; inicio: string | null; origem: string; atendimento_id: string | null }
export type Medicamento = { id: string; nome: string; principio_ativo: string; dose: string | null; posologia: string | null; inicio: string | null; fim: string | null; ativo: boolean; origem: string; atendimento_id: string | null; profissionais: Prof | null }
export type Alergia = { id: string; substancia: string; reacao: string | null; gravidade: string | null; registrada_em: string | null; origem: string }
export type Exame = { id: string; nome: string; pedido_em: string | null; resultado_em: string | null; resultado: string | null; alterado: boolean | null; origem: string; atendimento_id: string | null; organizacoes: Org | null }
export type Documento = { id: string; tipo: string; titulo: string; data_documento: string | null; status: string; criado_em: string; arquivo_path: string | null }

export type Dossie = {
  paciente: Paciente
  atendimentos: Atendimento[]
  condicoes: Condicao[]
  medicamentos: Medicamento[]
  alergias: Alergia[]
  exames: Exame[]
  documentos: Documento[]
}

const ORG = 'organizacoes(id,nome,tipo,rede,cidade)'
const PROF = 'profissionais(id,nome,conselho,numero,uf,especialidade)'

// Carrega o dossiê inteiro. Com o cliente do usuário, as regras do banco (RLS) garantem que só vem o que ele pode ver:
// sem consentimento ativo, o paciente nem aparece e a função devolve null.
export async function carregarDossie(sb: SupabaseClient, pacienteId: string): Promise<Dossie | null> {
  const { data: paciente } = await sb.from('pacientes').select('*').eq('id', pacienteId).maybeSingle()
  if (!paciente) return null
  const [at, co, me, al, ex, dc] = await Promise.all([
    sb.from('atendimentos').select(`id,data,tipo,rede,operadora,local_texto,profissional_texto,queixa,hipotese,conduta,origem,${ORG},${PROF}`).eq('paciente_id', pacienteId).order('data', { ascending: false }),
    sb.from('condicoes').select('*').eq('paciente_id', pacienteId).order('inicio', { ascending: false }),
    sb.from('medicamentos').select(`*,${PROF}`).eq('paciente_id', pacienteId).order('inicio', { ascending: false }),
    sb.from('alergias').select('*').eq('paciente_id', pacienteId),
    sb.from('exames').select(`*,${ORG}`).eq('paciente_id', pacienteId).order('pedido_em', { ascending: false }),
    sb.from('documentos').select('id,tipo,titulo,data_documento,status,criado_em,arquivo_path').eq('paciente_id', pacienteId).order('criado_em', { ascending: false }),
  ])
  return {
    paciente: paciente as Paciente,
    atendimentos: (at.data ?? []) as unknown as Atendimento[],
    condicoes: (co.data ?? []) as Condicao[],
    medicamentos: (me.data ?? []) as unknown as Medicamento[],
    alergias: (al.data ?? []) as Alergia[],
    exames: (ex.data ?? []) as unknown as Exame[],
    documentos: (dc.data ?? []) as Documento[],
  }
}

// Remédio em uso = ativo e sem data de fim no passado.
export function emUso(m: Medicamento, hoje = new Date()): boolean {
  if (!m.ativo) return false
  if (!m.fim) return true
  return new Date(m.fim + 'T23:59:59-03:00') >= hoje
}

export type ItemLinha =
  | { tipo: 'atendimento'; data: string; a: Atendimento; condicoes: Condicao[]; medicamentos: Medicamento[]; exames: Exame[] }
  | { tipo: 'resultado'; data: string; e: Exame }
  | { tipo: 'medicamento'; data: string; m: Medicamento }

// Linha do tempo: cada atendimento leva junto o que nasceu dele; resultados de exame e remédios
// sem atendimento entram como itens próprios.
export function linhaDoTempo(d: Dossie): ItemLinha[] {
  const itens: ItemLinha[] = d.atendimentos.map((a) => ({
    tipo: 'atendimento' as const,
    data: a.data,
    a,
    condicoes: d.condicoes.filter((c) => c.atendimento_id === a.id),
    medicamentos: d.medicamentos.filter((m) => m.atendimento_id === a.id),
    exames: d.exames.filter((e) => e.atendimento_id === a.id),
  }))
  for (const e of d.exames) if (e.resultado_em) itens.push({ tipo: 'resultado', data: e.resultado_em + 'T18:00:00-03:00', e })
  for (const m of d.medicamentos) if (!m.atendimento_id && m.inicio) itens.push({ tipo: 'medicamento', data: m.inicio + 'T12:00:00-03:00', m })
  return itens.sort((x, y) => (x.data < y.data ? 1 : -1))
}
