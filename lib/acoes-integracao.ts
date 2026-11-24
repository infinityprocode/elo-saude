'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from './supabase/server'
import { carregarDossie } from './dossie'
import { receberBundle } from './integracao'
import { mensagemLaboratorio } from './fixtures/laboratorio-jose'
import { permitir, MIN } from './limite'

// Demonstração da entrada FHIR (P-ELO-02): o profissional com acesso ao José dispara a mesma
// mensagem que um laboratório mandaria pelo POST /api/fhir/receber. Só para o José fictício.
const JOSE = '00000000-0000-4000-8000-0000000000c2'

export async function simularLaboratorio(form: FormData) {
  const id = String(form.get('paciente') ?? ''), voltar = String(form.get('voltar') ?? '/')
  if (id !== JOSE || !/^\/(clinica|consultorio)\/p\//.test(voltar)) redirect('/')
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/?entrar=1')
  if (!permitir(`simlab:${user.id}`, 6, 10 * MIN)) redirect(`${voltar}?lab=limite`)
  const d = await carregarDossie(sb, id)
  if (!d) redirect('/')
  const ontem = new Date(Date.now() - 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const r = await receberBundle(mensagemLaboratorio(ontem), 'Laboratório Vale Litoral')
  redirect(`${voltar}?lab=${r.ok ? (r.inseridos ? `novos-${r.inseridos}` : 'repetido') : 'erro'}#resumo`)
}
