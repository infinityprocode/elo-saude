'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'
import { permitir, ipDaRequisicao, MIN } from '@/lib/limite'

// Profissional aceita o QR: o banco liga o consentimento a ele, põe o paciente na carteira e audita.
export async function aceitar(form: FormData) {
  const token = String(form.get('token'))
  if (!/^[a-f0-9]{16,64}$/.test(token)) redirect('/')
  if (!permitir(`qr:${await ipDaRequisicao()}`, 20, 10 * MIN)) redirect(`/c/${token}?falhou=limite`)
  const sb = await supabaseServidor()
  const { data: pacienteId, error } = await sb.rpc('aceitar_compartilhamento', { tok: token })
  if (error || !pacienteId) redirect(`/c/${token}?falhou=1`)
  redirect(`/consultorio/p/${pacienteId}`)
}
