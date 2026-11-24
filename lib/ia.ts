// Elo Saúde · IA de apoio. Regras fixas:
//  - saída sempre em JSON com esquema estrito, temperatura 0;
//  - a IA só extrai ou organiza o que está escrito/dito; não dá diagnóstico nem prescreve;
//  - nada entra no dossiê sem confirmação de uma pessoa (paciente ou profissional);
//  - chave do OpenRouter exclusiva do Elo, com teto de gasto; só usada no servidor.

const URL = 'https://openrouter.ai/api/v1/chat/completions'
export const MODELO_VISAO = 'anthropic/claude-sonnet-5.5'
export const MODELO_TEXTO = 'anthropic/claude-haiku-5.5'

type Msg = { role: 'system' | 'user'; content: string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } } | { type: 'file'; file: { filename: string; file_data: string } })[] }

export async function iaJSON<T>(modelo: string, mensagens: Msg[], nome: string, schema: object, maxTokens = 1500): Promise<T> {
  const chave = process.env.OPENROUTER_API_KEY
  if (!chave) throw new Error('IA indisponível: chave não configurada')
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json', 'X-Title': 'Elo Saude (Hack Brasil 2026)' },
    body: JSON.stringify({ model: modelo, messages: mensagens, temperature: 0, max_tokens: maxTokens, response_format: { type: 'json_schema', json_schema: { name: nome, strict: true, schema } } }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!r.ok) throw new Error(`IA respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const j = await r.json()
  const texto: string = j.choices?.[0]?.message?.content ?? ''
  if (j.choices?.[0]?.finish_reason === 'length') throw new Error('resposta da IA cortada (limite de tokens)')
  const limpo = texto.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  return JSON.parse(limpo) as T
}

const N = (t: string) => ({ type: ['string', 'null'], description: t })
const CONF = { type: 'string', enum: ['alta', 'media', 'baixa'] }

// ===== Leitura de documento =====
export type Leitura = {
  tipo: 'receita' | 'atestado' | 'pedido_exame' | 'resultado_exame' | 'resumo_alta' | 'outro'
  data_documento: string | null; unidade: string | null; paciente_nome: string | null
  profissional: { nome: string | null; conselho: string | null; numero: string | null } | null
  diagnostico: { descricao: string; cid10: string | null; trecho: string } | null
  medicamentos: { nome: string; principio_ativo: string; dose: string | null; posologia: string | null; duracao_dias: number | null; trecho: string; confianca: 'alta' | 'media' | 'baixa' }[]
  // resultado/referencia/alterado só em laudo (resultado_exame); em pedido vêm null
  exames: { nome: string; trecho: string; resultado: string | null; referencia: string | null; alterado: boolean | null }[]
  afastamento_dias: number | null; orientacoes: string[]; documento_ficticio: boolean; legivel: boolean
}

const SCHEMA_LEITURA = {
  type: 'object', additionalProperties: false,
  required: ['tipo', 'data_documento', 'unidade', 'paciente_nome', 'profissional', 'diagnostico', 'medicamentos', 'exames', 'afastamento_dias', 'orientacoes', 'documento_ficticio', 'legivel'],
  properties: {
    tipo: { type: 'string', enum: ['receita', 'atestado', 'pedido_exame', 'resultado_exame', 'resumo_alta', 'outro'] },
    data_documento: N('data no formato AAAA-MM-DD, só se estiver escrita'),
    unidade: N('nome da unidade, clínica ou hospital, como escrito'),
    paciente_nome: N('nome do paciente, como escrito'),
    profissional: { type: ['object', 'null'], additionalProperties: false, required: ['nome', 'conselho', 'numero'], properties: { nome: N('nome'), conselho: N('CRM, CRO etc.'), numero: N('número do registro, como escrito') } },
    diagnostico: { type: ['object', 'null'], additionalProperties: false, required: ['descricao', 'cid10', 'trecho'], properties: { descricao: { type: 'string' }, cid10: N('CID-10 só se escrito'), trecho: { type: 'string' } } },
    medicamentos: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['nome', 'principio_ativo', 'dose', 'posologia', 'duracao_dias', 'trecho', 'confianca'], properties: {
      nome: { type: 'string', description: 'nome e apresentação como escrito, ex.: Cefalexina 250 mg/5 mL suspensão' },
      principio_ativo: { type: 'string', description: 'princípio ativo em minúsculas, sem acento, ex.: cefalexina, acido acetilsalicilico' },
      dose: N('quanto por vez'), posologia: N('frequência e duração como escrito'), duracao_dias: { type: ['integer', 'null'] },
      trecho: { type: 'string', description: 'texto exatamente como aparece no documento' }, confianca: CONF } } },
    exames: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['nome', 'trecho', 'resultado', 'referencia', 'alterado'], properties: { nome: { type: 'string' }, trecho: { type: 'string' },
      resultado: N('em laudo: valor e unidade como escritos, ex.: 132 mg/dL; em pedido: null'), referencia: N('em laudo: faixa de referência impressa; em pedido: null'),
      alterado: { type: ['boolean', 'null'], description: 'true só se o laudo marca como alterado ou o valor está fora da faixa de referência IMPRESSA; null em pedido ou sem faixa' } } } },
    afastamento_dias: { type: ['integer', 'null'] },
    orientacoes: { type: 'array', items: { type: 'string' } },
    documento_ficticio: { type: 'boolean', description: 'true se o documento diz que é fictício/demonstração' },
    legivel: { type: 'boolean' },
  },
}

const SISTEMA_LEITURA = `Você lê documentos de saúde brasileiros (receitas, atestados, pedidos e resultados de exame, resumos de alta), inclusive letra de mão.
Regras:
- Extraia SOMENTE o que está escrito. Nunca deduza diagnóstico, dose ou remédio que não esteja no papel.
- Em pedidos de exame, liste apenas os exames marcados (com X) ou escritos (resultado, referencia e alterado = null).
- Em resultados de exame (laudos), copie o valor com a unidade e a faixa de referência impressa; alterado só pela faixa impressa ou marcação do laudo. Não interprete.
- Campo ilegível ou ausente: null. Se a leitura de um remédio for incerta, confianca "baixa".
- "trecho": copie o texto como aparece, para o paciente conferir.
- Se a imagem não for um documento de saúde, tipo "outro" e listas vazias.
- Não comente, não aconselhe: só preencha o formato.`

export async function lerDocumento(dataUrl: string, mime: string): Promise<Leitura> {
  const anexo = mime === 'application/pdf'
    ? { type: 'file' as const, file: { filename: 'documento.pdf', file_data: dataUrl } }
    : { type: 'image_url' as const, image_url: { url: dataUrl } }
  return iaJSON<Leitura>(MODELO_VISAO, [
    { role: 'system', content: SISTEMA_LEITURA },
    { role: 'user', content: [{ type: 'text', text: 'Leia este documento e preencha o formato.' }, anexo] },
  ], 'leitura_documento', SCHEMA_LEITURA, 2000)
}

// ===== Atendimento por voz: organiza o que o médico ditou =====
export type Estrutura = {
  queixa: string | null; hipotese: string | null; cid10: string | null; conduta: string | null
  medicamentos: { nome: string; principio_ativo: string; dose: string | null; posologia: string | null; duracao_dias: number | null }[]
  exames: { nome: string }[]; retorno_dias: number | null
  // P-ELO-05: remédios que o médico mandou suspender, parar ou trocar (o antigo)
  suspensos: { nome: string; principio_ativo: string }[]
}
const SCHEMA_ESTRUTURA = {
  type: 'object', additionalProperties: false, required: ['queixa', 'hipotese', 'cid10', 'conduta', 'medicamentos', 'exames', 'retorno_dias', 'suspensos'],
  properties: {
    queixa: N('queixa principal, como dita'), hipotese: N('hipótese diagnóstica, como dita'), cid10: N('só se o médico ditou o CID'),
    conduta: N('conduta e orientações, resumidas'),
    medicamentos: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['nome', 'principio_ativo', 'dose', 'posologia', 'duracao_dias'], properties: { nome: { type: 'string' }, principio_ativo: { type: 'string', description: 'minúsculas, sem acento' }, dose: N('dose'), posologia: N('frequência'), duracao_dias: { type: ['integer', 'null'] } } } },
    exames: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['nome'], properties: { nome: { type: 'string' } } } },
    retorno_dias: { type: ['integer', 'null'] },
    suspensos: { type: 'array', description: 'remédios que o médico mandou suspender, parar ou trocar (o que sai)', items: { type: 'object', additionalProperties: false, required: ['nome', 'principio_ativo'], properties: { nome: { type: 'string' }, principio_ativo: { type: 'string', description: 'minúsculas, sem acento' } } } },
  },
}
const SISTEMA_ESTRUTURA = `Você organiza o que um médico ditou ao fim de uma consulta, em português do Brasil.
Regras: use SOMENTE o que foi dito; não acrescente diagnóstico, remédio, dose ou exame; não corrija a conduta.
Se algo não foi dito, null ou lista vazia. CID só se o médico falou o código. Texto curto e clínico.
Remédio que o médico mandou suspender, parar ou trocar vai em "suspensos" (o que sai), nunca em "medicamentos" (o que entra).`

export async function estruturarAtendimento(ditado: string): Promise<Estrutura> {
  return iaJSON<Estrutura>(MODELO_TEXTO, [{ role: 'system', content: SISTEMA_ESTRUTURA }, { role: 'user', content: `Ditado do médico:\n"""${ditado.slice(0, 6000)}"""` }], 'atendimento', SCHEMA_ESTRUTURA, 2000)
}

// ===== Resumo de 30 segundos: cada frase aponta para registros reais =====
export type FraseResumo = { texto: string; fontes: string[] }
const SCHEMA_RESUMO = {
  type: 'object', additionalProperties: false, required: ['frases'],
  properties: { frases: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['texto', 'fontes'], properties: { texto: { type: 'string' }, fontes: { type: 'array', items: { type: 'string' } } } } } },
}
const SISTEMA_RESUMO = `Você resume o histórico de saúde para um profissional, em até 6 frases curtas, em português do Brasil.
Regras: use só os registros fornecidos; toda frase lista em "fontes" os ids dos registros que a sustentam;
não dê diagnóstico, não recomende tratamento, não especule. Priorize: alergias, doenças crônicas, remédios em uso,
atendimentos recentes em lugares diferentes, exames alterados e os alertas já calculados (explique-os em linguagem clara).`

export async function resumir(registros: object): Promise<FraseResumo[]> {
  const r = await iaJSON<{ frases: FraseResumo[] }>(MODELO_TEXTO, [{ role: 'system', content: SISTEMA_RESUMO }, { role: 'user', content: JSON.stringify(registros) }], 'resumo', SCHEMA_RESUMO, 2500)
  return r.frases
}
