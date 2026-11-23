'use server'
import { redirect } from 'next/navigation'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { supabaseServidor } from '@/lib/supabase/server'
import { lerDocumento, type Leitura } from '@/lib/ia'

const TIPOS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }
const EXEMPLOS: Record<string, { arquivo: string; mime: string }> = {
  receita: { arquivo: 'receita-foto.jpg', mime: 'image/jpeg' },
  'pedido-exame': { arquivo: 'pedido-exame-foto.jpg', mime: 'image/jpeg' },
  atestado: { arquivo: 'atestado-foto.jpg', mime: 'image/jpeg' },
}
const TITULO: Record<Leitura['tipo'], string> = { receita: 'Receita', atestado: 'Atestado', pedido_exame: 'Pedido de exame', resultado_exame: 'Resultado de exame', resumo_alta: 'Resumo de alta', outro: 'Documento' }

// Envia a foto (ou um exemplo), guarda no armazenamento privado e pede a leitura à IA.
// O resultado fica "aguardando confirmação": nada entra no dossiê sem o paciente conferir.
export async function enviarDocumento(form: FormData) {
  const pacienteId = String(form.get('paciente'))
  const voltar = (q: string) => redirect(`/app/p/${pacienteId}/documentos?${q}`)
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/?entrar=1')

  let bytes: Buffer, mime: string
  const exemplo = EXEMPLOS[String(form.get('exemplo') ?? '')]
  if (exemplo) {
    bytes = await readFile(join(process.cwd(), 'public', 'exemplos', exemplo.arquivo)); mime = exemplo.mime
  } else {
    const f = form.get('arquivo')
    if (!(f instanceof File) || f.size === 0) return voltar('erro=arquivo')
    if (f.size > 10 * 1024 * 1024) return voltar('erro=grande')
    if (!TIPOS[f.type]) return voltar('erro=tipo')
    bytes = Buffer.from(await f.arrayBuffer()); mime = f.type
  }

  const caminho = `${pacienteId}/${randomUUID()}.${TIPOS[mime]}`
  const { error: eUp } = await sb.storage.from('documentos').upload(caminho, bytes, { contentType: mime, upsert: false })
  if (eUp) return voltar('erro=envio')

  let leitura: Leitura
  try { leitura = await lerDocumento(`data:${mime};base64,${bytes.toString('base64')}`, mime) } catch { return voltar('erro=ia') }

  const { data: doc, error } = await sb.from('documentos').insert({
    paciente_id: pacienteId, tipo: leitura.tipo, titulo: `${TITULO[leitura.tipo]}${leitura.unidade ? ` · ${leitura.unidade}` : ''}`,
    arquivo_path: caminho, extraido: leitura, status: 'aguardando_confirmacao', data_documento: leitura.data_documento, enviado_por: user.id,
  }).select('id').single()
  if (error || !doc) return voltar('erro=salvar')
  redirect(`/app/p/${pacienteId}/documentos/${doc.id}`)
}
