'use server'
import { supabaseServidor } from '@/lib/supabase/server'
import { ehContaDemo } from '@/lib/acesso'
import { permitir, MIN } from '@/lib/limite'

type Inicio = { erro?: string; factorId?: string; qr?: string; segredo?: string }

// 1) gera o QR do app autenticador (fator ainda não verificado)
export async function iniciarCadastro(): Promise<Inicio> {
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { erro: 'Entre de novo.' }
  if (ehContaDemo(user.email)) return { erro: 'Na demonstração a verificação em 2 etapas fica desligada: a conta é compartilhada pelo júri.' }
  // cadastro começado e abandonado não pode travar um novo
  const { data: fatores } = await sb.auth.mfa.listFactors()
  for (const f of fatores?.all ?? []) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id })
  const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Elo Saúde ${Date.now()}` })
  if (error || !data) return { erro: 'Não deu para começar agora. Tente de novo.' }
  return { factorId: data.id, qr: data.totp.qr_code, segredo: data.totp.secret }
}

// 2) confirma com o primeiro código: o fator passa a valer e a sessão já fica em 2 etapas
export async function confirmarCadastro(factorId: string, codigo: string): Promise<{ erro?: string; ok?: boolean }> {
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { erro: 'Entre de novo.' }
  if (!permitir(`ativar:${user.id}`, 8, 10 * MIN)) return { erro: 'Muitas tentativas. Espere alguns minutos.' }
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: codigo.replace(/\D/g, '') })
  if (error) return { erro: 'Código incorreto. Confira o app e tente de novo.' }
  return { ok: true }
}

// 3) desativar exige estar em 2 etapas nesta sessão (quem só tem a senha não desliga a proteção)
export async function desativar(): Promise<{ erro?: string; ok?: boolean }> {
  const sb = await supabaseServidor()
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel !== 'aal2') return { erro: 'Confirme o código antes de desativar.' }
  const { data: fatores } = await sb.auth.mfa.listFactors()
  for (const f of fatores?.totp ?? []) await sb.auth.mfa.unenroll({ factorId: f.id })
  return { ok: true }
}
