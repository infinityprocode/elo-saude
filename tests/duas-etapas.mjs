// Elo Saúde · prova da verificação em 2 etapas NO BANCO (P-ELO-04).
// Cria um profissional só de teste com consentimento do José, ativa o app autenticador pela API e confere:
// só com senha (aal1) o banco não mostra o paciente; com o código (aal2), mostra. Apaga tudo no fim.
// Precisa da chave de serviço (ELO_SUPABASE_SERVICE_ROLE_KEY), por isso roda no servidor e NÃO no GitHub:
// o CI nunca recebe uma chave que passa por cima das regras.
// Uso (Node 22): set -a; . <cofre>/elo-saude.env; set +a; node tests/duas-etapas.mjs
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const URL_ = process.env.ELO_SUPABASE_URL, ANON = process.env.ELO_SUPABASE_ANON_KEY, SERV = process.env.ELO_SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERV) { console.error('faltam ELO_SUPABASE_URL, ELO_SUPABASE_ANON_KEY ou ELO_SUPABASE_SERVICE_ROLE_KEY'); process.exit(2) }
const op = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERV, op)
const JOSE = '00000000-0000-4000-8000-0000000000c2'
const email = `teste.2fa.${Date.now()}@elosaude.infinityprocode.com.br`, senha = crypto.randomBytes(18).toString('base64url')

// RFC 6238 (TOTP, SHA-1, 30 s, 6 dígitos), o mesmo cálculo do app autenticador
function totp(base32) {
  const al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''
  for (const c of base32.replace(/=+$/, '').toUpperCase()) bits += al.indexOf(c).toString(2).padStart(5, '0')
  const chave = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)))
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)))
  const h = crypto.createHmac('sha1', chave).update(ctr).digest(); const o = h[h.length - 1] & 15
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0')
}

const res = []; const ok = (n, c, i = '') => res.push({ n, c, i })
let uid, profId
try {
  const { data: u, error: eU } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true }); if (eU) throw eU; uid = u.user.id
  const { data: p, error: eP } = await admin.from('profissionais').insert({ user_id: uid, nome: 'Teste 2 etapas', conselho: 'CRM', numero: '999999', uf: 'SP' }).select('id').single(); if (eP) throw eP; profId = p.id
  const { error: eC } = await admin.from('consentimentos').insert({ paciente_id: JOSE, profissional_id: profId, escopo: 'completo', inicio: new Date(Date.now() - 60000).toISOString(), fim: new Date(Date.now() + 3600000).toISOString(), criado_por: uid }); if (eC) throw eC

  const sb = createClient(URL_, ANON, op)
  await sb.auth.signInWithPassword({ email, password: senha })
  const ver = async () => ((await sb.from('pacientes').select('id').eq('id', JOSE)).data ?? []).length
  ok('sem 2 etapas ativadas, a senha basta (comportamento normal)', (await ver()) === 1)

  const { data: f } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'teste' })
  await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: totp(f.totp.secret) })
  ok('ativar exige o código do app e a sessão sobe para 2 etapas', (await sb.auth.mfa.getAuthenticatorAssuranceLevel()).data?.currentLevel === 'aal2')

  const sb2 = createClient(URL_, ANON, op)
  await sb2.auth.signInWithPassword({ email, password: senha })
  const n1 = ((await sb2.from('pacientes').select('id').eq('id', JOSE)).data ?? []).length
  ok('com 2 etapas ativadas, só a senha NÃO mostra o paciente (o banco barra)', n1 === 0)
  ok('o banco avisa que falta o código', (await sb2.rpc('preciso_do_codigo')).data === true)
  const { error: eErr } = await sb2.auth.mfa.challengeAndVerify({ factorId: f.id, code: '000000' })
  ok('código errado é recusado', !!eErr)
  await sb2.auth.mfa.challengeAndVerify({ factorId: f.id, code: totp(f.totp.secret) })
  const n2 = ((await sb2.from('pacientes').select('id').eq('id', JOSE)).data ?? []).length
  ok('com o código certo, o paciente aparece', n2 === 1)
} catch (e) { ok('execução sem erro', false, e.message ?? String(e)) }
finally {
  if (profId) { await admin.from('consentimentos').delete().eq('profissional_id', profId); await admin.from('carteiras').delete().eq('profissional_id', profId); await admin.from('profissionais').delete().eq('id', profId) }
  if (uid) { const { error } = await admin.auth.admin.deleteUser(uid); ok('conta de teste apagada', !error, error?.message) }
}
for (const r of res) console.log(`${r.c ? 'ok  ' : 'FALHA'}  ${r.n}${r.i ? `  (${r.i})` : ''}`)
const falhas = res.filter((r) => !r.c).length
console.log(`\n${res.length - falhas} de ${res.length} verificações`)
process.exit(falhas ? 1 : 0)
