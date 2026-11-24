import type { Dossie, Medicamento } from './dossie'
import { dataBR } from './formato'

// Alertas de APOIO ao profissional. As regras são uma lista curta e conferida, escrita aqui;
// nada é inventado pela IA. O alerta aponta e explica; quem decide é o profissional.
export type Alerta = { id: string; gravidade: 'alta' | 'media'; tipo: 'divergencia' | 'interacao' | 'alergia' | 'exame_repetido' | 'resultado'; titulo: string; detalhe: string; quando: string }

const AINE = ['ibuprofeno', 'diclofenaco', 'naproxeno', 'cetoprofeno', 'nimesulida']
const PENICILINAS = ['penicilina', 'amoxicilina', 'ampicilina', 'benzilpenicilina']
const SINTOMAS = ['febre', 'dor', 'tosse', 'vômito', 'diarreia', 'coceira', 'falta de ar', 'cansaço']

// hipóteses equivalentes não são divergência: "Artrose do joelho" e "artrose do joelho direito" são a mesma
const PALAVRAS_VAZIAS = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'em', 'a', 'o', 'com', 'sem', 'direito', 'direita', 'esquerdo', 'esquerda', 'leve', 'aguda', 'agudo', 'cronica', 'cronico'])
const termos = (t: string) => new Set(t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !PALAVRAS_VAZIAS.has(w)).map((w) => w.slice(0, 6)))
export function mesmaHipotese(a: string, b: string): boolean {
  const A = termos(a), B = termos(b)
  if (!A.size || !B.size) return false
  const comum = [...A].filter((w) => B.has(w)).length
  return comum / Math.min(A.size, B.size) >= 0.6
}

const dia = (s: string) => new Date(s.length === 10 ? s + 'T12:00:00-03:00' : s).getTime()
const DIA = 864e5
const pa = (m: Medicamento) => m.principio_ativo.toLowerCase()
const ehAine = (m: Medicamento) => AINE.includes(pa(m))

// dois remédios convivem se os períodos se cruzam (sem depender da data de hoje)
function convivem(a: Medicamento, b: Medicamento) {
  const ai = dia(a.inicio ?? '1900-01-01'), af = a.fim ? dia(a.fim) : Infinity
  const bi = dia(b.inicio ?? '1900-01-01'), bf = b.fim ? dia(b.fim) : Infinity
  return ai <= bf && bi <= af
}
const quemReceitou = (m: Medicamento) => (m.profissionais ? `${m.profissionais.nome}` : 'prescritor não informado')

export function calcularAlertas(d: Dossie): Alerta[] {
  const out: Alerta[] = []

  // 1. hipóteses diferentes em até 7 dias, em lugares diferentes
  const ats = [...d.atendimentos].filter((a) => a.hipotese).sort((x, y) => dia(x.data) - dia(y.data))
  for (let i = 1; i < ats.length; i++) {
    const a = ats[i - 1], b = ats[i]
    const dias = Math.round((dia(b.data) - dia(a.data)) / DIA)
    if (dias <= 7 && !mesmaHipotese(a.hipotese!, b.hipotese!)) {
      const comuns = SINTOMAS.filter((s) => a.queixa?.toLowerCase().includes(s) && b.queixa?.toLowerCase().includes(s))
      out.push({ id: `div-${a.id}-${b.id}`, gravidade: 'alta', tipo: 'divergencia', quando: b.data,
        titulo: `Hipóteses diferentes em ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
        detalhe: `${a.organizacoes?.nome ?? 'Atendimento'} (${dataBR(a.data)}): ${a.hipotese}. ${b.organizacoes?.nome ?? 'Atendimento'} (${dataBR(b.data)}): ${b.hipotese}.${comuns.length ? ` Em comum: ${comuns.join(', ')}.` : ''} Vale reavaliar considerando os dois.` })
    }
  }

  // 2. interações e contraindicações
  const meds = d.medicamentos
  const condicao = (t: string) => d.condicoes.find((c) => c.status !== 'resolvida' && c.descricao.toLowerCase().includes(t))
  const varicela = condicao('varicela')
  for (const m of meds.filter(ehAine)) {
    if (varicela && (!m.inicio || dia(m.inicio) >= dia(varicela.inicio ?? m.inicio))) {
      out.push({ id: `aine-var-${m.id}`, gravidade: 'alta', tipo: 'interacao', quando: m.inicio ?? '',
        titulo: `${m.nome.split(' ')[0]} com catapora registrada`,
        detalhe: `Anti-inflamatórios como ${pa(m)} são desaconselhados na catapora (risco de infecção grave de pele). Receitado por ${quemReceitou(m)} em ${dataBR(m.inicio)}; catapora registrada em ${dataBR(varicela.inicio)}.` })
    }
    if (d.paciente.gestante) {
      out.push({ id: `aine-gest-${m.id}`, gravidade: 'alta', tipo: 'interacao', quando: m.inicio ?? '',
        titulo: `${m.nome.split(' ')[0]} na gestação`,
        detalhe: 'Anti-inflamatórios devem ser evitados na gestação, sobretudo após 20 semanas.' })
    }
  }
  const varfarina = meds.find((m) => pa(m) === 'varfarina')
  if (varfarina) {
    for (const m of meds.filter((x) => x !== varfarina && (ehAine(x) || pa(x) === 'acido acetilsalicilico'))) {
      if (!convivem(varfarina, m)) continue
      out.push({ id: `varf-${m.id}`, gravidade: 'alta', tipo: 'interacao', quando: m.inicio ?? '',
        titulo: `Varfarina + ${m.nome.split(' ')[0]}`,
        detalhe: `Risco aumentado de sangramento. Varfarina de ${quemReceitou(varfarina)}; ${m.nome} de ${quemReceitou(m)} (${dataBR(m.inicio)}). Os dois médicos podem não saber um do outro.` })
    }
  }
  const aas = meds.find((m) => pa(m) === 'acido acetilsalicilico')
  for (const m of meds.filter(ehAine)) {
    if (aas && convivem(aas, m)) out.push({ id: `aas-${m.id}`, gravidade: 'media', tipo: 'interacao', quando: m.inicio ?? '',
      titulo: `AAS + ${m.nome.split(' ')[0]}`, detalhe: 'A soma aumenta o risco de sangramento no estômago e pode reduzir o efeito protetor do AAS.' })
  }

  // 3. alergia x remédio
  for (const al of d.alergias) {
    const s = al.substancia.toLowerCase()
    const grupo = s.includes('penicilina') ? PENICILINAS : [s, s === 'dipirona' ? 'metamizol' : s]
    for (const m of meds.filter((x) => grupo.includes(pa(x)))) {
      out.push({ id: `alerg-${al.id}-${m.id}`, gravidade: 'alta', tipo: 'alergia', quando: m.inicio ?? '',
        titulo: `Alergia a ${al.substancia}`, detalhe: `${m.nome} receitado em ${dataBR(m.inicio)}; alergia registrada (${al.reacao ?? 'reação não descrita'}).` })
    }
  }

  // 4. exame pedido de novo em até 7 dias
  const exs = [...d.exames].filter((e) => e.pedido_em).sort((x, y) => dia(x.pedido_em!) - dia(y.pedido_em!))
  for (let i = 0; i < exs.length; i++) for (let j = i + 1; j < exs.length; j++) {
    const a = exs[i], b = exs[j]
    const dias = Math.round((dia(b.pedido_em!) - dia(a.pedido_em!)) / DIA)
    if (a.nome === b.nome && dias <= 7) out.push({ id: `rep-${a.id}-${b.id}`, gravidade: 'media', tipo: 'exame_repetido', quando: b.pedido_em!,
      titulo: `${a.nome} pedido de novo em ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
      detalhe: a.resultado ? `Já existe resultado de ${dataBR(a.resultado_em)}: ${a.resultado}` : `Pedido anterior em ${dataBR(a.pedido_em)} ainda sem resultado.` })
  }

  // 5. INR acima da faixa com varfarina em uso na data do resultado (risco de sangramento)
  const varf = meds.filter((m) => pa(m) === 'varfarina')
  for (const e of d.exames.filter((x) => x.alterado && x.resultado_em && /\binr\b|protrombina/i.test(x.nome))) {
    const t = dia(e.resultado_em!)
    const m = varf.find((v) => dia(v.inicio ?? '1900-01-01') <= t && (!v.fim || dia(v.fim) >= t) && v.ativo)
    if (m) out.push({ id: `inr-${e.id}`, gravidade: 'alta', tipo: 'resultado', quando: e.resultado_em!,
      titulo: 'INR fora da faixa com varfarina em uso',
      detalhe: `${e.nome} de ${dataBR(e.resultado_em)}: ${e.resultado}. ${m.nome} em uso desde ${dataBR(m.inicio)}.` })
  }

  return out.sort((x, y) => (x.gravidade === y.gravidade ? (x.quando < y.quando ? 1 : -1) : x.gravidade === 'alta' ? -1 : 1))
}
