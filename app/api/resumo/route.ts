import { NextResponse } from 'next/server'
import { permitir, MIN } from '@/lib/limite'
import { supabaseServidor } from '@/lib/supabase/server'
import { carregarDossie, emUso } from '@/lib/dossie'
import { calcularAlertas } from '@/lib/alertas'
import { resumir } from '@/lib/ia'

export const maxDuration = 60

// Resumo de 30 segundos. O dossiê é lido com a sessão de quem pede (o banco decide o que pode ver).
// Toda frase precisa citar registros reais; frase sem fonte válida é descartada antes de aparecer.
export async function POST(req: Request) {
  const { pacienteId } = await req.json()
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'entre de novo' }, { status: 401 })
  if (!permitir(`resumo:${user.id}`, 20, 10 * MIN)) return NextResponse.json({ erro: 'Muitos pedidos seguidos. Espere alguns minutos.' }, { status: 429 })
  const d = await carregarDossie(sb, String(pacienteId))
  if (!d) return NextResponse.json({ erro: 'sem acesso' }, { status: 404 })
  const alertas = calcularAlertas(d)
  // ids curtos (r1, r2...) para a IA: menos texto, menos chance de errar; o servidor traduz de volta
  const reg: Record<string, { id: string; tipo: string }> = {}
  let n = 0
  const add = (id: string, t: string) => { const k = `r${++n}`; reg[k] = { id, tipo: t }; return k }
  const registros = {
    paciente: { nome: d.paciente.nome, nascimento: d.paciente.nascimento, gestante: d.paciente.gestante },
    alergias: d.alergias.map((a) => ({ id: add(a.id, 'alergia'), substancia: a.substancia, gravidade: a.gravidade, reacao: a.reacao })),
    condicoes: d.condicoes.map((c) => ({ id: add(c.id, 'condição'), descricao: c.descricao, status: c.status, cronica: c.cronica, inicio: c.inicio })),
    remedios_em_uso: d.medicamentos.filter((m) => emUso(m)).map((m) => ({ id: add(m.id, 'remédio'), nome: m.nome, posologia: m.posologia, inicio: m.inicio, prescritor: m.profissionais?.nome })),
    atendimentos: d.atendimentos.slice(0, 8).map((a) => ({ id: add(a.id, 'atendimento'), data: a.data.slice(0, 10), local: a.organizacoes?.nome ?? a.local_texto, rede: a.rede, queixa: a.queixa, hipotese: a.hipotese, conduta: a.conduta })),
    exames: d.exames.slice(0, 10).map((e) => ({ id: add(e.id, 'exame'), nome: e.nome, resultado: e.resultado, alterado: e.alterado, data: e.resultado_em ?? e.pedido_em })),
    alertas: alertas.map((a) => ({ id: add(`alerta-${a.id}`, 'alerta'), titulo: a.titulo, detalhe: a.detalhe })),
  }
  try {
    const frases = (await resumir(registros))
      .map((f) => ({ texto: f.texto, fontes: f.fontes.filter((k) => k in reg).map((k) => reg[k]) }))
      .filter((f) => f.fontes.length > 0)
    return NextResponse.json({ frases })
  } catch (e) {
    console.error('resumo IA falhou:', (e as Error).message)
    return NextResponse.json({ erro: 'a IA não respondeu agora' }, { status: 502 })
  }
}
