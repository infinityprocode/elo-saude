'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'

const PRAZOS: Record<string, number> = { '1h': 1, '24h': 24, '7d': 24 * 7 }

// Paciente gera um compartilhamento em aberto (QR). O banco só aceita se ele for o dono do dossiê (RLS).
export async function criarCompartilhamento(form: FormData) {
  const pacienteId = String(form.get('paciente'))
  const horas = PRAZOS[String(form.get('prazo'))] ?? 24
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/?entrar=1')
  const fim = new Date(Date.now() + horas * 3600_000).toISOString()
  const { data, error } = await sb.from('consentimentos').insert({ paciente_id: pacienteId, escopo: 'completo', fim, criado_por: user.id }).select('id').single()
  if (error || !data) redirect(`/app/p/${pacienteId}/compartilhar?erro=1`)
  redirect(`/app/p/${pacienteId}/compartilhar?novo=${data.id}`)
}

export async function revogar(form: FormData) {
  const pacienteId = String(form.get('paciente'))
  const sb = await supabaseServidor()
  const { error } = await sb.rpc('revogar_consentimento', { cid: String(form.get('consentimento')) })
  redirect(`/app/p/${pacienteId}/compartilhar${error ? '?erro=1' : '?revogado=1'}`)
}
