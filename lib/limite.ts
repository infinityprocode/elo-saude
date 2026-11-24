import { headers } from 'next/headers'

// Limite de tentativas (P-ELO-04). Janela fixa em memória: o Elo roda num único processo Node no servidor,
// então o contador é exato. Se um dia rodar em mais de uma instância, troca por um contador no banco.
// Protege: força bruta em token de QR/emergência, abuso do login de demonstração e custo de IA.
const baldes = new Map<string, { n: number; ate: number }>()

export function permitir(chave: string, max: number, janelaMs: number): boolean {
  const agora = Date.now()
  if (baldes.size > 5000) for (const [k, v] of baldes) if (v.ate < agora) baldes.delete(k)
  const b = baldes.get(chave)
  if (!b || b.ate < agora) { baldes.set(chave, { n: 1, ate: agora + janelaMs }); return true }
  b.n += 1
  return b.n <= max
}

// O Caddy na frente substitui o X-Forwarded-For mandado pelo cliente pelo IP real (sem trusted_proxies),
// então o primeiro valor é confiável aqui.
export async function ipDaRequisicao(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'sem-ip'
}

export const MIN = 60_000
