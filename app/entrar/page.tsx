import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { Marca } from '@/components/Marca'
import { entrarComSenha } from './actions'
import s from '@/app/c/[token]/qr.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Entrar · Elo Saúde' }

const ERROS: Record<string, string> = {
  campos: 'Preencha o e-mail e a senha.',
  credenciais: 'E-mail ou senha não conferem.',
  limite: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
}

// Entrada com conta própria. Para conhecer o Elo, as contas de demonstração ficam na página inicial.
export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <main className={s.pagina}>
      <div className={s.cartao}>
        <Marca tamanho={36} />
        <span className={s.icone} aria-hidden="true"><KeyRound size={28} /></span>
        <h1>Entrar no Elo</h1>
        {erro && <p className={s.aviso} role="alert">{ERROS[erro] ?? 'Não deu para entrar agora.'}</p>}
        <form action={entrarComSenha} className={s.formulario}>
          <label>E-mail<input name="email" type="email" autoComplete="username" required /></label>
          <label>Senha<input name="senha" type="password" autoComplete="current-password" required /></label>
          <button type="submit" className="btn btn-primario">Entrar</button>
        </form>
        <p className={s.nota}>Profissionais com verificação em 2 etapas informam o código do app autenticador em seguida.</p>
        <Link href="/#demo" className={s.voltar}>Quero ver a demonstração (sem cadastro)</Link>
      </div>
    </main>
  )
}
