import { createHmac } from 'node:crypto'
import { supabaseAdmin } from './supabase/admin'

// Entrada FHIR R4 de parceiros (P-ELO-02). Recebe um Bundle com Patient (CPF no OID oficial do Brasil)
// e Observations; acha o paciente pelo HMAC do CPF (o número não fica guardado) e junta os resultados.
// Usa a chave de serviço só aqui, depois de autenticar o parceiro (token) ou o profissional (consentimento).
const OID_CPF = 'urn:oid:2.16.840.1.113883.13.237'
const ALTERADO = new Set(['A', 'AA', 'H', 'HH', 'HU', 'L', 'LL', 'LU', 'POS'])
type Rec = { resourceType: string; id?: string; [k: string]: unknown }
const fmt = (n: number) => String(n).replace('.', ',')

export type Resultado = { ok: boolean; erro?: string; paciente?: string; inseridos?: number; repetidos?: number }

export async function receberBundle(bundle: unknown, origem: string): Promise<Resultado> {
  const b = bundle as { resourceType?: string; entry?: { resource?: Rec }[] }
  if (b?.resourceType !== 'Bundle' || !Array.isArray(b.entry)) return { ok: false, erro: 'esperado um Bundle FHIR R4' }
  const recursos = b.entry.map((e) => e.resource).filter(Boolean) as Rec[]
  const pac = recursos.find((r) => r.resourceType === 'Patient')
  const cpf = ((pac?.identifier as { system?: string; value?: string }[] | undefined) ?? []).find((i) => i.system === OID_CPF)?.value?.replace(/\D/g, '')
  if (!cpf) return { ok: false, erro: 'Patient sem CPF (identifier system urn:oid:2.16.840.1.113883.13.237)' }
  const chave = process.env.ELO_HMAC_KEY
  if (!chave) return { ok: false, erro: 'integração não configurada' }
  const hmac = createHmac('sha256', chave).update(cpf).digest('hex')
  const sb = supabaseAdmin()
  const { data: paciente } = await sb.from('pacientes').select('id, nome').eq('cpf_hmac', hmac).maybeSingle()
  if (!paciente) return { ok: false, erro: 'paciente não encontrado no Elo' }

  const obs = recursos.filter((r) => r.resourceType === 'Observation' && r.status === 'final').slice(0, 50)
  const linhas = obs.map((o) => {
    const code = o.code as { text?: string; coding?: { display?: string }[] } | undefined
    const q = o.valueQuantity as { value?: number; unit?: string } | undefined
    const faixa = ((o.referenceRange as { text?: string }[] | undefined) ?? [])[0]?.text
    const valor = q?.value != null ? `${fmt(q.value)}${q.unit && !q.unit.startsWith('{') ? ` ${q.unit}` : ''}` : (o.valueString as string | undefined) ?? ''
    const interp = ((o.interpretation as { coding?: { code?: string }[] }[] | undefined) ?? []).flatMap((i) => i.coding ?? []).map((c) => c.code ?? '')
    return {
      paciente_id: paciente.id,
      nome: (code?.text ?? code?.coding?.[0]?.display ?? 'Exame').slice(0, 200),
      resultado: [valor, faixa ? `(referência ${faixa})` : ''].filter(Boolean).join(' ').slice(0, 300) || null,
      resultado_em: typeof o.effectiveDateTime === 'string' ? o.effectiveDateTime.slice(0, 10) : null,
      alterado: interp.some((c) => ALTERADO.has(c)) ? true : interp.length ? false : null,
      origem: 'integracao_fhir',
      origem_ref: `${origem.slice(0, 60)}:${o.id ?? ''}`,
    }
  })
  let inseridos = 0
  for (const l of linhas) {
    const { error } = await sb.from('exames').insert(l)
    if (!error) inseridos++
    else if (error.code !== '23505') return { ok: false, erro: 'falha ao gravar' }   // 23505 = já recebido antes
  }
  if (inseridos) await sb.from('acessos').insert({ paciente_id: paciente.id, ator_nome: `Integração: ${origem}`.slice(0, 120), acao: 'recebeu_integracao', organizacao_nome: `${inseridos} resultado(s) em FHIR R4` })
  return { ok: true, paciente: paciente.nome.split(' ')[0], inseridos, repetidos: linhas.length - inseridos }
}
