'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'

// Contas de demonstração (dados fictícios). As senhas ficam só no .env do servidor.
const CONTAS = {
  marina: { email: 'marina.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_MARINA_SENHA },
  jose: { email: 'jose.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_JOSE_SENHA },
  camila: { email: 'camila.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_CAMILA_SENHA },
} as const

export async function entrarDemo(form: FormData) {
  const chave = String(form.get('conta')) as keyof typeof CONTAS
  const conta = CONTAS[chave]
  if (!conta) redirect('/?erro=conta')
  const sb = await supabaseServidor()
  const { error } = await sb.auth.signInWithPassword({ email: conta.email, password: conta.senha() ?? '' })
  if (error) redirect('/?erro=login')
  redirect('/app')
}
