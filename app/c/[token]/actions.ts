'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'

// Profissional aceita o QR: o banco liga o consentimento a ele, põe o paciente na carteira e audita.
export async function aceitar(form: FormData) {
  const token = String(form.get('token'))
  if (!/^[a-f0-9]{16,64}$/.test(token)) redirect('/')
  const sb = await supabaseServidor()
  const { data: pacienteId, error } = await sb.rpc('aceitar_compartilhamento', { tok: token })
  if (error || !pacienteId) redirect(`/c/${token}?falhou=1`)
  redirect(`/consultorio/p/${pacienteId}`)
}
