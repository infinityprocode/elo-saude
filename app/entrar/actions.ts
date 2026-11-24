'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'
import { permitir, ipDaRequisicao, MIN } from '@/lib/limite'

// Contas de demonstração (dados fictícios). As senhas ficam só no .env do servidor.
const CONTAS = {
  marina: { email: 'marina.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_MARINA_SENHA },
  jose: { email: 'jose.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_JOSE_SENHA },
  camila: { email: 'camila.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_CAMILA_SENHA },
  paula: { email: 'paula.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_PAULA_SENHA },
  fernando: { email: 'fernando.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_FERNANDO_SENHA },
} as const

export async function entrarDemo(form: FormData) {
  const chave = String(form.get('conta')) as keyof typeof CONTAS
  const conta = CONTAS[chave]
  if (!conta) redirect('/?erro=conta')
  if (!permitir(`entrar:${await ipDaRequisicao()}`, 30, 10 * MIN)) redirect('/?erro=limite')
  const sb = await supabaseServidor()
  const { error } = await sb.auth.signInWithPassword({ email: conta.email, password: conta.senha() ?? '' })
  if (error) redirect('/?erro=login')
  // volta só para caminhos internos conhecidos (evita redirecionamento aberto)
  const volta = String(form.get('volta') ?? '')
  if (/^\/c\/[a-f0-9]{16,64}$/.test(volta)) redirect(volta)
  redirect(chave === 'paula' ? '/clinica' : chave === 'fernando' ? '/consultorio' : '/app')
}
