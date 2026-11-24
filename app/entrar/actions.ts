'use server'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'
import { permitir, ipDaRequisicao, MIN } from '@/lib/limite'
import { destinoDe } from '@/lib/acesso'

// Contas de demonstração (dados fictícios). As senhas ficam só no .env do servidor.
const CONTAS = {
  marina: { email: 'marina.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_MARINA_SENHA },
  jose: { email: 'jose.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_JOSE_SENHA },
  camila: { email: 'camila.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_CAMILA_SENHA },
  paula: { email: 'paula.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_PAULA_SENHA },
  fernando: { email: 'fernando.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_FERNANDO_SENHA },
  recepcao: { email: 'recepcao.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_RECEPCAO_SENHA },
  gestor: { email: 'gestor.demo@elosaude.infinityprocode.com.br', senha: () => process.env.DEMO_GESTOR_SENHA },
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
  const { data: { user } } = await sb.auth.getUser()
  redirect(user ? await destinoDe(sb, user.id) : '/app')
}

// Entrada com e-mail e senha (contas reais; a demonstração usa os botões acima).
// Mensagem única para e-mail inexistente ou senha errada (não revela quem tem conta) e limite por IP e por e-mail.
export async function entrarComSenha(form: FormData) {
  const email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 160)
  const senha = String(form.get('senha') ?? '')
  if (!email || !senha) redirect('/entrar?erro=campos')
  const ip = await ipDaRequisicao()
  if (!permitir(`senha-ip:${ip}`, 20, 10 * MIN) || !permitir(`senha-email:${email}`, 6, 10 * MIN)) redirect('/entrar?erro=limite')
  const sb = await supabaseServidor()
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha })
  if (error || !data.user) redirect('/entrar?erro=credenciais')
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') redirect('/verificar')
  redirect(await destinoDe(sb, data.user.id))
}
