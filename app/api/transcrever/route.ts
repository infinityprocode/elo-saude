import { NextResponse } from 'next/server'
import { supabaseServidor } from '@/lib/supabase/server'
import { estruturarAtendimento } from '@/lib/ia'
import { permitir, MIN } from '@/lib/limite'

export const maxDuration = 120

// Só profissional logado. Áudio vai para a transcrição no NOSSO servidor (Whisper, instância do Elo);
// o texto vai para a IA organizar. Nada é salvo aqui: o médico revisa e confirma depois.
export async function POST(req: Request) {
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'entre de novo' }, { status: 401 })
  const { data: prof } = await sb.from('profissionais').select('id').eq('user_id', user.id).maybeSingle()
  if (!prof) return NextResponse.json({ erro: 'só profissionais' }, { status: 403 })
  if (!permitir(`voz:${user.id}`, 20, 10 * MIN)) return NextResponse.json({ erro: 'Muitos pedidos seguidos. Espere alguns minutos.' }, { status: 429 })

  let ditado = ''
  const tipo = req.headers.get('content-type') ?? ''
  if (tipo.includes('multipart/form-data')) {
    const f = (await req.formData()).get('audio')
    if (!(f instanceof File) || f.size === 0) return NextResponse.json({ erro: 'sem áudio' }, { status: 400 })
    if (f.size > 15 * 1024 * 1024) return NextResponse.json({ erro: 'áudio grande demais' }, { status: 413 })
    const b64 = Buffer.from(await f.arrayBuffer()).toString('base64')
    const r = await fetch(`${process.env.ELO_STT_URL}/media`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.ELO_STT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ b64 }), signal: AbortSignal.timeout(110_000) })
    if (!r.ok) return NextResponse.json({ erro: 'não deu para transcrever' }, { status: 502 })
    ditado = String((await r.json()).text ?? '').trim()
  } else {
    ditado = String((await req.json()).texto ?? '').trim()
  }
  if (ditado.length < 10) return NextResponse.json({ erro: 'ditado muito curto' }, { status: 400 })
  try {
    return NextResponse.json({ ditado, estrutura: await estruturarAtendimento(ditado) })
  } catch {
    return NextResponse.json({ ditado, erro: 'a IA não respondeu; preencha à mão' }, { status: 502 })
  }
}
