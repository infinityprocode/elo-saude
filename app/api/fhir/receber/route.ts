import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { receberBundle } from '@/lib/integracao'
import { permitir, ipDaRequisicao, MIN } from '@/lib/limite'

// Entrada FHIR R4 para parceiros (laboratório, hospital): POST com Bundle e token do parceiro.
// Sem token válido não lê nada; o paciente é achado pelo HMAC do CPF, nunca pelo número.
export async function POST(req: Request) {
  const ip = await ipDaRequisicao()
  if (!permitir(`fhir-in:${ip}`, 30, 10 * MIN)) return NextResponse.json({ erro: 'muitos envios seguidos' }, { status: 429 })
  const esperado = process.env.ELO_INTEGRACAO_TOKEN ?? ''
  const veio = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const ok = esperado.length >= 32 && veio.length === esperado.length && timingSafeEqual(Buffer.from(veio), Buffer.from(esperado))
  if (!ok) return NextResponse.json({ erro: 'parceiro não autorizado' }, { status: 401 })
  const texto = await req.text()
  if (texto.length > 512_000) return NextResponse.json({ erro: 'mensagem grande demais' }, { status: 413 })
  let bundle: unknown
  try { bundle = JSON.parse(texto) } catch { return NextResponse.json({ erro: 'JSON inválido' }, { status: 400 }) }
  const origem = (req.headers.get('x-elo-origem') ?? 'Parceiro').replace(/[^\p{L}\p{N} .,-]/gu, '').slice(0, 60) || 'Parceiro'
  const r = await receberBundle(bundle, origem)
  return NextResponse.json(r, { status: r.ok ? 200 : r.erro === 'paciente não encontrado no Elo' ? 404 : 422 })
}
