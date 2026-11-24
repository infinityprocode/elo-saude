import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { Marca } from '@/components/Marca'
import { supabaseServidor } from '@/lib/supabase/server'
import { verificarCodigo } from './actions'
import s from '@/app/c/[token]/qr.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Verificação · Elo Saúde' }

const ERROS: Record<string, string> = {
  formato: 'O código tem 6 números.',
  codigo: 'Código incorreto ou vencido. Confira o app autenticador e tente de novo.',
  limite: 'Muitas tentativas. Espere alguns minutos.',
}

export default async function Verificar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/entrar')
  return (
    <main className={s.pagina}>
      <div className={s.cartao}>
        <Marca tamanho={36} />
        <span className={s.icone} aria-hidden="true"><ShieldCheck size={28} /></span>
        <h1>Verificação em 2 etapas</h1>
        <p>Abra o app autenticador e digite o código de 6 números do Elo Saúde.</p>
        {erro && <p className={s.aviso} role="alert">{ERROS[erro] ?? 'Não deu para verificar.'}</p>}
        <form action={verificarCodigo} className={s.formulario}>
          <label>Código<input name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus /></label>
          <button type="submit" className="btn btn-primario">Verificar</button>
        </form>
        <form action="/sair" method="post"><button type="submit" className={s.voltar} style={{ background: 'none', border: 0, cursor: 'pointer' }}>Sair</button></form>
        <Link href="/" className={s.voltar}>Voltar ao início</Link>
      </div>
    </main>
  )
}
