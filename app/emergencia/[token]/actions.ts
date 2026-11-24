'use server'
import { supabaseServidor } from '@/lib/supabase/server'
import { permitir, ipDaRequisicao, MIN } from '@/lib/limite'

export type Cartao = { nome: string; nascimento: string; tipo_sanguineo: string | null; contato: string | null; gestante: boolean; alergias: { substancia: string; reacao: string | null; gravidade: string | null }[]; remedios: { nome: string; posologia: string | null }[]; cronicas: string[] }
export type Estado = { cartao?: Cartao; erro?: string }

// Acesso de emergência: nome e justificativa obrigatórios; o banco devolve só o essencial e audita.
export async function abrirCartao(_: Estado, form: FormData): Promise<Estado> {
  const token = String(form.get('token'))
  const quem = String(form.get('quem') ?? '').trim()
  const justificativa = String(form.get('justificativa') ?? '').trim()
  // contra adivinhação de token: 10 aberturas por IP a cada 10 minutos
  if (!permitir(`emergencia:${await ipDaRequisicao()}`, 10, 10 * MIN)) return { erro: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.' }
  if (quem.length < 3) return { erro: 'Informe seu nome e função.' }
  if (justificativa.length < 10) return { erro: 'Descreva o motivo do acesso (pelo menos 10 letras).' }
  const sb = await supabaseServidor()
  const { data, error } = await sb.rpc('cartao_emergencia', { tok: token, quem, justificativa })
  if (error) return { erro: 'Não deu para abrir o cartão. Confira os dados.' }
  if (!data) return { erro: 'Cartão inválido, vencido ou cancelado.' }
  return { cartao: data as Cartao }
}
