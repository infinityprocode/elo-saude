// Elo Saúde · teste de isolamento e segurança do banco.
// Entra com cada conta de demonstração pela CHAVE PÚBLICA (o mesmo caminho do app, sem chave de serviço)
// e confere o que cada uma pode e não pode ver ou fazer. Sai com código 1 se qualquer regra falhar.
// Uso: ELO_SUPABASE_URL=... ELO_SUPABASE_ANON_KEY=... ELO_DEMO_<CONTA>_SENHA=... ELO_TOKEN_EMERGENCIA=... node tests/isolamento.mjs
import { createClient } from '@supabase/supabase-js'

const URL = process.env.ELO_SUPABASE_URL, ANON = process.env.ELO_SUPABASE_ANON_KEY
const ID = { livia: '00000000-0000-4000-8000-0000000000c1', jose: '00000000-0000-4000-8000-0000000000c2', camila: '00000000-0000-4000-8000-0000000000c3' }
const CONS_LIVIA_CLINICA = '00000000-0000-4000-8000-0000000000f1'
const resultados = []
const ok = (nome, cond, detalhe = '') => { resultados.push({ nome, ok: !!cond, detalhe }); }

const sessoes = new Map()  // uma entrada por conta: o Supabase limita logins por minuto
async function entrar(conta) {
  if (sessoes.has(conta)) return sessoes.get(conta)
  const sb = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  sessoes.set(conta, sb)
  if (conta) {
    const { error } = await sb.auth.signInWithPassword({ email: `${conta}.demo@elosaude.infinityprocode.com.br`, password: process.env[`ELO_DEMO_${conta.toUpperCase()}_SENHA`] })
    if (error) throw new Error(`login ${conta}: ${error.message}`)
  }
  return sb
}
// consulta com uma nova tentativa em erro de rede; erro persistente vira falha com a mensagem (nunca passa em silêncio)
const erros = []
async function consulta(sb, t, col) {
  for (let i = 0; i < 2; i++) {
    const { data, error } = await sb.from(t).select(col)
    if (!error) return data ?? []
    if (i === 1) erros.push(`${t}: ${error.message}`)
    await new Promise((r) => setTimeout(r, 800))
  }
  return []
}
const ids = async (sb, t, col = 'paciente_id') => [...new Set((await consulta(sb, t, col)).map((r) => r[col]))].sort()
const conta = async (sb, t) => { const { data } = await sb.from(t).select('id'); return (data ?? []).length }

// Matriz de visibilidade: quem vê quais dossiês
const MATRIZ = {
  marina: [ID.livia], jose: [ID.jose], camila: [ID.camila],
  paula: [ID.livia, ID.jose, ID.camila].sort(),   // consentimento para a clínica onde atua
  fernando: [ID.jose],                            // consentimento direto para o consultório dele
  recepcao: [], gestor: [], ricardo: [], anon: [],
}
const TABELAS = ['atendimentos', 'condicoes', 'medicamentos', 'alergias', 'exames', 'documentos']

for (const [c, esperado] of Object.entries(MATRIZ)) {
  const sb = await entrar(c === 'anon' ? null : c)
  ok(`${c}: pacientes visíveis = ${esperado.length}`, JSON.stringify(await ids(sb, 'pacientes', 'id')) === JSON.stringify(esperado))
  for (const t of TABELAS) {
    const vistos = await ids(sb, t)
    ok(`${c}: ${t} só dos pacientes permitidos`, vistos.every((p) => esperado.includes(p)), vistos.join(','))
  }
  // não pode passar no vazio: quem tem permissão vê os atendimentos de TODOS os seus pacientes
  ok(`${c}: vê os atendimentos de todos os seus pacientes`, JSON.stringify(await ids(sb, 'atendimentos')) === JSON.stringify(esperado))
}

// Agenda: recepção vê a agenda da clínica (nome e horário) mas nenhum dado clínico
{
  const sb = await entrar('recepcao')
  ok('recepção: vê a agenda da clínica', (await conta(sb, 'agenda')) === 6)
  ok('recepção: não vê nenhum atendimento', (await conta(sb, 'atendimentos')) === 0)
  const { error } = await sb.from('condicoes').insert({ paciente_id: ID.livia, descricao: 'teste', status: 'hipotese', origem: 'profissional' })
  ok('recepção: não consegue registrar dado clínico', !!error)
  const { data: abriu } = await sb.rpc('abrir_dossie', { p: ID.livia })
  ok('recepção: não abre dossiê', abriu === false)
}

// Profissional sem consentimento (UPA) não vê e não registra
{
  const sb = await entrar('ricardo')
  const { data: abriu } = await sb.rpc('abrir_dossie', { p: ID.livia })
  ok('Dr. Ricardo (sem consentimento): abrir_dossie recusa', abriu === false)
  const { error } = await sb.from('atendimentos').insert({ paciente_id: ID.livia, data: new Date().toISOString(), tipo: 'consulta', rede: 'sus', origem: 'profissional', profissional_id: '00000000-0000-4000-8000-0000000000b2' })
  ok('Dr. Ricardo (sem consentimento): não registra atendimento', !!error)
}

// Abrir dossiê grava auditoria que o paciente vê
{
  const sb = await entrar('fernando')
  const { data: abriu } = await sb.rpc('abrir_dossie', { p: ID.jose })
  ok('Dr. Fernando (consentimento direto): abre o dossiê do José', abriu === true)
  const jose = await entrar('jose')
  // (aberturas repetidas em 30 minutos contam como uma só; por isso procura, não exige ser a última)
  const { data: ac } = await jose.from('acessos').select('ator_nome,acao').eq('ator_nome', 'Dr. Fernando Costa').eq('acao', 'visualizou').limit(1)
  ok('José vê na auditoria que o Dr. Fernando abriu', (ac ?? []).length === 1)
}

// Prontuário imutável e auditoria só de inclusão
{
  const paula = await entrar('paula')
  const { error } = await paula.from('atendimentos').update({ conduta: 'alterado' }).eq('id', '00000000-0000-4000-8000-0000000000e5')
  const { data: depois } = await paula.from('atendimentos').select('conduta').eq('id', '00000000-0000-4000-8000-0000000000e5').single()
  ok('Atendimento do profissional não se altera', !!error || !depois?.conduta?.startsWith('alterado'), error?.message ?? '')
  const jose = await entrar('jose')
  const { data: antes } = await jose.from('acessos').select('id')
  await jose.from('acessos').delete().gte('id', 0)
  await jose.from('acessos').update({ ator_nome: 'apagado' }).gte('id', 0)
  const { data: apos } = await jose.from('acessos').select('id,ator_nome')
  ok('Auditoria: paciente não apaga nem altera', (apos ?? []).length === (antes ?? []).length && !(apos ?? []).some((a) => a.ator_nome === 'apagado'))
  const { error: e2 } = await jose.from('atendimentos').insert({ paciente_id: ID.jose, data: new Date().toISOString(), tipo: 'consulta', rede: 'particular', origem: 'profissional' })
  ok('Paciente não se passa por profissional', !!e2)
}

// Revogação: a mãe revoga, a clínica perde o acesso na hora; depois o consentimento é refeito
{
  const marina = await entrar('marina'), paula = await entrar('paula')
  // revoga todos os consentimentos ativos da Lívia com a clínica (rodadas anteriores criam novos)
  const { data: ativos } = await marina.from('consentimentos').select('id').eq('paciente_id', ID.livia).eq('organizacao_id', '00000000-0000-4000-8000-0000000000a4').is('revogado_em', null)
  let eRev = null
  for (const k of ativos ?? []) { const { error } = await marina.rpc('revogar_consentimento', { cid: k.id }); eRev = eRev ?? error }
  ok('Responsável revoga o consentimento', (ativos ?? []).length > 0 && !eRev, eRev?.message ?? '')
  ok('Clínica perde a Lívia na hora', !(await ids(paula, 'pacientes', 'id')).includes(ID.livia))
  const { data: { user } } = await marina.auth.getUser()
  const { error: eNovo } = await marina.from('consentimentos').insert({ paciente_id: ID.livia, organizacao_id: '00000000-0000-4000-8000-0000000000a4', escopo: 'completo', fim: '2026-12-31T23:59:00-03:00', criado_por: user.id })
  ok('Responsável dá o consentimento de novo', !eNovo, eNovo?.message ?? '')
  ok('Clínica volta a ver a Lívia', (await ids(paula, 'pacientes', 'id')).includes(ID.livia))
  const { data: atual } = await marina.from('consentimentos').select('id').eq('paciente_id', ID.livia).is('revogado_em', null).limit(1)
  const { error: eOutro } = await paula.rpc('revogar_consentimento', { cid: atual?.[0]?.id ?? CONS_LIVIA_CLINICA })
  ok('Profissional não revoga consentimento alheio', !!eOutro)
}

// QR: o paciente gera, o profissional que lê aceita; vale uma vez; a revogação corta
{
  const marina = await entrar('marina'), ricardo = await entrar('ricardo'), recepcao = await entrar('recepcao')
  const { data: { user } } = await marina.auth.getUser()
  const fim = new Date(Date.now() + 3600_000).toISOString()
  const { data: qr, error: eQr } = await marina.from('consentimentos').insert({ paciente_id: ID.livia, escopo: 'completo', fim, criado_por: user.id }).select('id,token').single()
  ok('QR: responsável gera o compartilhamento', !eQr && !!qr?.token, eQr?.message ?? '')
  const { data: previa } = await ricardo.rpc('previa_compartilhamento', { tok: qr.token })
  ok('QR: antes de aceitar, o profissional vê só o primeiro nome', previa?.primeiro_nome === 'Lívia' && !('nascimento' in (previa ?? {})))
  const { error: eRec } = await recepcao.rpc('aceitar_compartilhamento', { tok: qr.token })
  ok('QR: quem não é profissional não aceita', !!eRec)
  const { data: pid } = await ricardo.rpc('aceitar_compartilhamento', { tok: qr.token })
  ok('QR: o profissional aceita e passa a ver a Lívia', pid === ID.livia && (await ids(ricardo, 'pacientes', 'id')).includes(ID.livia))
  const fernando = await entrar('fernando')
  const { data: pid2 } = await fernando.rpc('aceitar_compartilhamento', { tok: qr.token })
  ok('QR: vale uma vez só (outro profissional não reaproveita)', pid2 === null && !(await ids(fernando, 'pacientes', 'id')).includes(ID.livia))
  await marina.rpc('revogar_consentimento', { cid: qr.id })
  ok('QR: a responsável revoga e o profissional perde o acesso', !(await ids(ricardo, 'pacientes', 'id')).includes(ID.livia))
}

// Cartão de emergência: só com token, justificativa e só o essencial
{
  const anon = await entrar(null)
  const { data: ruim } = await anon.rpc('cartao_emergencia', { tok: 'token-errado', quem: 'Teste', justificativa: 'atendimento de urgência' })
  ok('Emergência: token errado não devolve nada', ruim === null)
  const { error: semJust } = await anon.rpc('cartao_emergencia', { tok: process.env.ELO_TOKEN_EMERGENCIA, quem: 'Teste', justificativa: 'x' })
  ok('Emergência: exige justificativa', !!semJust)
  const { data: card } = await anon.rpc('cartao_emergencia', { tok: process.env.ELO_TOKEN_EMERGENCIA, quem: 'Socorrista (teste)', justificativa: 'teste automático de isolamento' })
  ok('Emergência: devolve alergias e remédios, sem histórico', !!card && Array.isArray(card.alergias) && !('atendimentos' in card))
}

// Suspender remédio (P-ELO-05): só profissional com consentimento, com atendimento dele; nada se apaga
{
  const jose = await entrar('jose'), ricardo = await entrar('ricardo')
  const { data: meds } = await jose.from('medicamentos').select('id').eq('paciente_id', ID.jose).eq('ativo', true).limit(1)
  const med = meds?.[0]?.id
  ok('Suspensão: José tem remédio em uso para o teste', !!med)
  const qualquer = '00000000-0000-4000-8000-000000000999'
  const { error: eSemConsent } = await ricardo.rpc('suspender_medicamento', { med, atendimento: qualquer })
  ok('Suspensão: profissional sem consentimento não suspende', !!eSemConsent)
  const { error: ePaciente } = await jose.rpc('suspender_medicamento', { med, atendimento: qualquer })
  ok('Suspensão: o próprio paciente não usa a função de profissional', !!ePaciente)
  const { data: depois } = await jose.from('medicamentos').select('ativo').eq('id', med).single()
  ok('Suspensão: o remédio continua em uso depois das tentativas', depois?.ativo === true)
}

// Gestor (P-ELO-03): números da operação pela função do banco, nunca dado clínico, nunca outra clínica
{
  const gestor = await entrar('gestor'), recepcao = await entrar('recepcao'), paula = await entrar('paula')
  const VIDA_PLENA = '00000000-0000-4000-8000-0000000000a4'
  const { data: painel, error: eG } = await gestor.rpc('painel_gestor', { org: VIDA_PLENA })
  ok('Gestor: vê os números da própria clínica', !eG && !!painel && Array.isArray(painel.profissionais))
  ok('Gestor: os números não trazem nome de paciente', !!painel && !JSON.stringify(painel).match(/Lívia|José Almeida|Camila Rocha/))
  const { error: eR } = await recepcao.rpc('painel_gestor', { org: VIDA_PLENA })
  ok('Gestor: a recepção não acessa o painel do gestor', !!eR)
  const { error: eP } = await paula.rpc('painel_gestor', { org: VIDA_PLENA })
  ok('Gestor: a médica da clínica não acessa o painel do gestor', !!eP)
  const { error: eO } = await gestor.rpc('painel_gestor', { org: '00000000-0000-4000-8000-0000000000a1' })
  ok('Gestor: não vê os números de outra organização', !!eO)
}

if (erros.length) ok('Nenhuma consulta terminou em erro', false, erros.join(' | '))
const falhas = resultados.filter((r) => !r.ok)
for (const r of resultados) console.log(`${r.ok ? 'ok  ' : 'FALHA'}  ${r.nome}${r.ok || !r.detalhe ? '' : `  (${r.detalhe})`}`)
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} regras conferidas`)
process.exit(falhas.length ? 1 : 0)
