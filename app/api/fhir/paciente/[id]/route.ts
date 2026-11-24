import { NextResponse } from 'next/server'
import { supabaseServidor } from '@/lib/supabase/server'
import { carregarDossie } from '@/lib/dossie'
import { dossieParaFhir } from '@/lib/fhir'
import { permitir, MIN } from '@/lib/limite'

// Exporta o dossiê em HL7 FHIR R4 (P-ELO-02). Pela sessão de quem pede: o banco (RLS) só entrega
// para o próprio paciente/responsável ou para profissional com consentimento ativo.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ erro: 'paciente inválido' }, { status: 400 })
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'entre de novo' }, { status: 401 })
  if (!permitir(`fhir:${user.id}`, 30, 10 * MIN)) return NextResponse.json({ erro: 'muitos pedidos seguidos' }, { status: 429 })
  const d = await carregarDossie(sb, id)
  if (!d) return NextResponse.json({ erro: 'sem acesso a este paciente' }, { status: 404 })
  const bundle = dossieParaFhir(d)
  const nome = d.paciente.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      'Content-Type': 'application/fhir+json; charset=utf-8',
      'Content-Disposition': `attachment; filename="elo-saude-${nome}-fhir-r4.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
