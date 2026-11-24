'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'
import { permitir, MIN } from '@/lib/limite'
import { destinoDe } from '@/lib/acesso'

// Segunda etapa: código de 6 dígitos do app autenticador. 5 tentativas a cada 10 minutos por pessoa.
export async function verificarCodigo(form: FormData) {
  const codigo = String(form.get('codigo') ?? '').replace(/\D/g, '')
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/entrar')
  if (!permitir(`codigo:${user.id}`, 5, 10 * MIN)) redirect('/verificar?erro=limite')
  if (codigo.length !== 6) redirect('/verificar?erro=formato')
  const { data: fatores } = await sb.auth.mfa.listFactors()
  const totp = fatores?.totp?.find((f) => f.status === 'verified')
  if (!totp) redirect(await destinoDe(sb, user.id))
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: totp.id, code: codigo })
  if (error) redirect('/verificar?erro=codigo')
  redirect(await destinoDe(sb, user.id))
}
