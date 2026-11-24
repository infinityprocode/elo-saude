'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'
import type { Leitura } from '@/lib/ia'

const so = (v: FormDataEntryValue | null) => { const t = String(v ?? '').trim(); return t.length ? t.slice(0, 300) : null }
const dataOk = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)
const maisDias = (d: string, n: number) => { const x = new Date(d + 'T12:00:00-03:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }

// O paciente confirma o que a IA leu (podendo corrigir e desmarcar itens). Só então vira histórico, com origem "foto".
export async function confirmarDocumento(form: FormData) {
  const pacienteId = String(form.get('paciente')), docId = String(form.get('doc'))
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/?entrar=1')
  const { data: doc } = await sb.from('documentos').select('id,extraido,status').eq('id', docId).eq('paciente_id', pacienteId).maybeSingle()
  if (!doc || doc.status !== 'aguardando_confirmacao') redirect(`/app/p/${pacienteId}/documentos`)
  const L = doc.extraido as Leitura

  const data = dataOk(so(form.get('data'))) ?? new Date().toISOString().slice(0, 10)
  const rede = ['sus', 'particular', 'convenio'].includes(String(form.get('rede'))) ? String(form.get('rede')) : 'particular'
  const operadora = rede === 'convenio' ? so(form.get('operadora')) ?? 'Convênio não informado' : null
  const local = so(form.get('local')), medico = so(form.get('medico'))

  // liga ao cadastro quando o nome bate exatamente; senão guarda o texto lido
  const { data: org } = local ? await sb.from('organizacoes').select('id').ilike('nome', local).maybeSingle() : { data: null }
  const { data: prof } = medico ? await sb.from('profissionais').select('id').ilike('nome', medico).maybeSingle() : { data: null }

  const incluirDiag = form.get('diag') === 'on' && L.diagnostico
  const { data: at, error: eAt } = await sb.from('atendimentos').insert({
    paciente_id: pacienteId, organizacao_id: org?.id ?? null, profissional_id: prof?.id ?? null,
    local_texto: org ? null : local, profissional_texto: prof ? null : medico,
    data: `${data}T12:00:00-03:00`, tipo: 'consulta', rede, operadora,
    hipotese: incluirDiag ? L.diagnostico!.descricao : null,
    conduta: L.orientacoes.length ? L.orientacoes.join(' ').slice(0, 600) : null,
    origem: 'paciente_foto', documento_id: docId, registrado_por: user.id,
  }).select('id').single()
  if (eAt || !at) redirect(`/app/p/${pacienteId}/documentos/${docId}?erro=1`)

  const meds = L.medicamentos.map((m, i) => ({ m, i })).filter(({ i }) => form.get(`med_${i}`) === 'on')
  if (meds.length) await sb.from('medicamentos').insert(meds.map(({ m, i }) => ({
    paciente_id: pacienteId, nome: so(form.get(`med_${i}_nome`)) ?? m.nome, principio_ativo: m.principio_ativo,
    dose: so(form.get(`med_${i}_dose`)) ?? m.dose, posologia: so(form.get(`med_${i}_pos`)) ?? m.posologia,
    inicio: data, fim: m.duracao_dias ? maisDias(data, m.duracao_dias) : null,
    prescritor_id: prof?.id ?? null, atendimento_id: at.id, origem: 'paciente_foto',
  })))
  const exs = L.exames.map((e, i) => ({ e, i })).filter(({ i }) => form.get(`ex_${i}`) === 'on')
  // laudo grava o RESULTADO (valor, data e fora da referência); pedido grava só o pedido
  const laudo = L.tipo === 'resultado_exame'
  if (exs.length) await sb.from('exames').insert(exs.map(({ e }) => laudo
    ? { paciente_id: pacienteId, nome: e.nome, resultado_em: data, resultado: [e.resultado, e.referencia ? `(referência ${e.referencia})` : ''].filter(Boolean).join(' ') || null, alterado: e.alterado ?? null, atendimento_id: at.id, origem: 'paciente_foto' }
    : { paciente_id: pacienteId, nome: e.nome, pedido_em: data, atendimento_id: at.id, origem: 'paciente_foto' }))
  if (incluirDiag) await sb.from('condicoes').insert({ paciente_id: pacienteId, descricao: L.diagnostico!.descricao, cid10: L.diagnostico!.cid10, status: 'hipotese', inicio: data, atendimento_id: at.id, origem: 'paciente_foto' })

  await sb.from('documentos').update({ status: 'confirmado', data_documento: data }).eq('id', docId)
  redirect(`/app/p/${pacienteId}?f=tudo&salvo=1#linha`)
}

export async function descartarDocumento(form: FormData) {
  const pacienteId = String(form.get('paciente'))
  const sb = await supabaseServidor()
  await sb.from('documentos').update({ status: 'descartado' }).eq('id', String(form.get('doc'))).eq('paciente_id', pacienteId)
  redirect(`/app/p/${pacienteId}/documentos?descartado=1`)
}
