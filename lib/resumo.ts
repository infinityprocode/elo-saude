import { emUso, type Dossie } from './dossie'
import { calcularAlertas } from './alertas'
import { dataBR, idade } from './formato'

export type ResumoPaciente = { id: string; nome: string; idade: string; resumo: string[]; alertas: { titulo: string; detalhe: string; gravidade: 'alta' | 'media'; tipo: string }[]; mudou: string[] }

const lista = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)

// Resumo montado direto do dossiê (sem texto livre de IA): cada frase aponta para um registro.
export function resumirPaciente(d: Dossie): ResumoPaciente {
  const p = d.paciente
  const cron = d.condicoes.filter((c) => c.cronica && c.status !== 'resolvida').map((c) => c.descricao.toLowerCase())
  const recentes = d.condicoes.filter((c) => !c.cronica && c.status !== 'resolvida').map((c) => `${c.descricao.toLowerCase()}${c.status === 'hipotese' ? ' (hipótese)' : ''}`)
  const uso = d.medicamentos.filter((m) => emUso(m)).map((m) => m.nome)
  const ult = d.atendimentos.slice(0, 2).map((a) => `${dataBR(a.data)}, ${a.organizacoes?.nome ?? 'local não informado'}: ${a.hipotese ?? a.queixa ?? 'sem hipótese registrada'}`)
  const pend = d.exames.filter((e) => !e.resultado_em).map((e) => e.nome)
  const resumo = [
    `${p.nome}, ${idade(p.nascimento)}${p.gestante ? ', gestante' : ''}${p.peso_kg ? `, ${String(p.peso_kg).replace('.', ',')} kg` : ''}.`,
    cron.length ? `Condições crônicas: ${lista(cron)}.` : 'Sem condições crônicas registradas.',
    ...(recentes.length ? [`Recente: ${lista(recentes)}.`] : []),
    uso.length ? `Em uso (${uso.length}): ${lista(uso)}.` : 'Nenhum remédio em uso.',
    d.alergias.length ? `Alergia: ${lista(d.alergias.map((a) => `${a.substancia}${a.gravidade ? ` (${a.gravidade})` : ''}`))}.` : 'Sem alergias registradas.',
    ...ult.map((u, i) => (i === 0 ? `Último atendimento: ${u}.` : `Antes: ${u}.`)),
    ...(pend.length ? [`Aguardando resultado: ${lista(pend)}.`] : []),
  ]
  // "o que mudou": 30 dias antes do registro mais recente (a demo não depende da data de hoje)
  const datas = [...d.atendimentos.map((a) => a.data), ...d.exames.map((e) => e.resultado_em ?? e.pedido_em ?? ''), ...d.medicamentos.map((m) => m.inicio ?? '')].filter(Boolean).sort()
  const ref = datas.length ? new Date(datas[datas.length - 1].slice(0, 10) + 'T12:00:00-03:00').getTime() : Date.now()
  const desde = ref - 30 * 864e5
  const t = (s: string) => new Date(s.length === 10 ? s + 'T12:00:00-03:00' : s).getTime()
  const mudou = [
    ...d.atendimentos.filter((a) => t(a.data) >= desde).map((a) => `${dataBR(a.data)} · atendimento em ${a.organizacoes?.nome ?? 'local não informado'}: ${a.hipotese ?? a.queixa}`),
    ...d.medicamentos.filter((m) => m.inicio && t(m.inicio) >= desde).map((m) => `${dataBR(m.inicio)} · novo remédio: ${m.nome}${m.profissionais ? ` (${m.profissionais.nome})` : ''}`),
    ...d.exames.filter((e) => e.resultado_em && t(e.resultado_em) >= desde).map((e) => `${dataBR(e.resultado_em)} · resultado de ${e.nome}${e.alterado ? ' (alterado)' : ''}`),
  ].sort().reverse()
  return {
    id: p.id, nome: p.nome, idade: idade(p.nascimento), resumo,
    alertas: calcularAlertas(d).map((a) => ({ titulo: a.titulo, detalhe: a.detalhe, gravidade: a.gravidade, tipo: a.tipo })),
    mudou: mudou.length ? mudou : ['Nada novo nos 30 dias anteriores ao último registro.'],
  }
}
