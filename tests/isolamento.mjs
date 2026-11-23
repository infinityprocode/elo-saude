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
const ids = async (sb, t, col = 'paciente_id') => { const { data } = await sb.from(t).select(col); return [...new Set((data ?? []).map((r) => r[col]))].sort() }
const conta = async (sb, t) => { const { data } = await sb.from(t).select('id'); return (data ?? []).length }

// Matriz de visibilidade: quem vê quais dossiês
const MATRIZ = {
  marina: [ID.livia], jose: [ID.jose], camila: [ID.camila],
  paula: [ID.livia, ID.jose, ID.camila].sort(),   // consentimento para a clínica onde atua
  fernando: [ID.jose],                            // consentimento direto para o consultório dele
  recepcao: [], ricardo: [], anon: [],
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
  const { data: ac } = await jose.from('acessos').select('ator_nome,acao').order('em', { ascending: false }).limit(1)
  ok('José vê na auditoria que o Dr. Fernando abriu', ac?.[0]?.ator_nome === 'Dr. Fernando Costa' && ac?.[0]?.acao === 'visualizou')
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

const falhas = resultados.filter((r) => !r.ok)
for (const r of resultados) console.log(`${r.ok ? 'ok  ' : 'FALHA'}  ${r.nome}${r.ok || !r.detalhe ? '' : `  (${r.detalhe})`}`)
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} regras conferidas`)
process.exit(falhas.length ? 1 : 0)
