// Gera o FHIR R4 dos pacientes de demonstração, entrando COMO cada um (mesmas regras do app).
// Uso (Node 22): npx tsx tests/fhir-gerar.ts <pasta-de-saída>
import { writeFileSync, mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { carregarDossie } from '../lib/dossie'
import { dossieParaFhir } from '../lib/fhir'

async function main() {
  const saida = process.argv[2] ?? 'fhir-saida'
  mkdirSync(saida, { recursive: true })
  const PACIENTES = { marina: '00000000-0000-4000-8000-0000000000c1', jose: '00000000-0000-4000-8000-0000000000c2', camila: '00000000-0000-4000-8000-0000000000c3' }
  for (const [conta, id] of Object.entries(PACIENTES)) {
    const sb = createClient(process.env.ELO_SUPABASE_URL!, process.env.ELO_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
    const { error } = await sb.auth.signInWithPassword({ email: `${conta}.demo@elosaude.infinityprocode.com.br`, password: process.env[`ELO_DEMO_${conta.toUpperCase()}_SENHA`]! })
    if (error) throw new Error(`login ${conta}: ${error.message}`)
    const d = await carregarDossie(sb as never, id)
    if (!d) throw new Error(`sem dossiê ${conta}`)
    const b = dossieParaFhir(d)
    writeFileSync(`${saida}/${conta}.json`, JSON.stringify(b, null, 2))
    const tipos = b.entry.reduce<Record<string, number>>((m, e) => ({ ...m, [e.resource.resourceType]: (m[e.resource.resourceType] ?? 0) + 1 }), {})
    console.log(conta, JSON.stringify(tipos))
  }

}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })
