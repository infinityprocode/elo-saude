import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { Marca } from '@/components/Marca'
import { supabaseServidor } from '@/lib/supabase/server'
import { ehContaDemo, destinoDe } from '@/lib/acesso'
import { Ativar } from './Ativar'
import s from '@/app/c/[token]/qr.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Segurança da conta · Elo Saúde' }

export default async function Seguranca() {
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/entrar')
  const demo = ehContaDemo(user.email)
  const { data: fatores } = await sb.auth.mfa.listFactors()
  const ativo = !!fatores?.totp?.some((f) => f.status === 'verified')
  const voltar = await destinoDe(sb, user.id)
  return (
    <main className={s.pagina}>
      <div className={s.cartao}>
        <Marca tamanho={36} />
        <span className={s.icone} aria-hidden="true"><ShieldCheck size={28} /></span>
        <h1>Segurança da conta</h1>
        <p><strong>Verificação em 2 etapas.</strong> Além da senha, um código que muda a cada 30 segundos no app autenticador do seu celular. Recomendada para todo profissional de saúde.</p>
        {demo
          ? <p className={s.aviso}>Esta é uma conta de demonstração, usada por várias pessoas ao mesmo tempo. Aqui a verificação fica desligada; numa conta própria, ela é ativada nesta mesma tela.</p>
          : <Ativar ativo={ativo} />}
        <Link href={voltar} className={s.voltar}>Voltar</Link>
      </div>
    </main>
  )
}
