'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from './supabase/server'

const so = (v: FormDataEntryValue | null) => { const t = String(v ?? '').trim(); return t.length ? t.slice(0, 600) : null }
const maisDias = (d: string, n: number) => { const x = new Date(d + 'T12:00:00-03:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }

// Grava o atendimento revisado pelo médico. Tudo pela sessão dele: o banco exige consentimento ativo,
// que ele assine em nome próprio, e audita automaticamente (trigger). Depois de gravado, não se altera.
export async function registrarAtendimento(form: FormData) {
  const pacienteId = String(form.get('paciente')), voltar = String(form.get('voltar'))
  const destino = /^\/(clinica|consultorio)\/p\/[0-9a-f-]{36}$/.test(voltar) ? voltar : '/'
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/?entrar=1')
  const { data: prof } = await sb.from('profissionais').select('id').eq('user_id', user.id).maybeSingle()
  if (!prof) redirect('/app')
  const org = so(form.get('org'))
  const rede = ['sus', 'particular', 'convenio'].includes(String(form.get('rede'))) ? String(form.get('rede')) : 'particular'
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const hipotese = so(form.get('hipotese'))
  const { data: at, error } = await sb.from('atendimentos').insert({
    paciente_id: pacienteId, organizacao_id: org, profissional_id: prof.id, data: new Date().toISOString(), tipo: 'consulta',
    rede, operadora: rede === 'convenio' ? so(form.get('operadora')) ?? 'Convênio não informado' : null,
    queixa: so(form.get('queixa')), hipotese, conduta: so(form.get('conduta')), origem: 'profissional', registrado_por: user.id,
  }).select('id').single()
  if (error || !at) redirect(`${destino}?erro=registro#atender`)

  const n = Number(form.get('n_meds') ?? 0)
  const meds = Array.from({ length: Math.min(n, 20) }, (_, i) => i).filter((i) => form.get(`med_${i}`) === 'on' && so(form.get(`med_${i}_nome`)))
  if (meds.length) await sb.from('medicamentos').insert(meds.map((i) => {
    const dias = Number(form.get(`med_${i}_dias`) ?? 0)
    return { paciente_id: pacienteId, nome: so(form.get(`med_${i}_nome`))!, principio_ativo: (so(form.get(`med_${i}_pa`)) ?? so(form.get(`med_${i}_nome`))!).toLowerCase(),
      dose: so(form.get(`med_${i}_dose`)), posologia: so(form.get(`med_${i}_pos`)), inicio: hoje, fim: dias > 0 ? maisDias(hoje, dias) : null,
      prescritor_id: prof.id, atendimento_id: at.id, origem: 'profissional' }
  }))
  const ex = String(form.get('exames') ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20)
  if (ex.length) await sb.from('exames').insert(ex.map((nome) => ({ paciente_id: pacienteId, nome, pedido_em: hoje, atendimento_id: at.id, origem: 'profissional' })))
  // P-ELO-05: suspensões confirmadas pelo médico (o banco confere consentimento e o atendimento dele)
  const susp = form.getAll('susp').map(String).filter((v) => /^[0-9a-f-]{36}$/.test(v)).slice(0, 20)
  for (const med of susp) await sb.rpc('suspender_medicamento', { med, atendimento: at.id })
  if (hipotese) await sb.from('condicoes').insert({ paciente_id: pacienteId, descricao: hipotese, cid10: so(form.get('cid10')), status: 'hipotese', inicio: hoje, atendimento_id: at.id, origem: 'profissional' })
  redirect(`${destino}?registrado=1#linha`)
}
