import Link from 'next/link'
import { Clock3, QrCode, ShieldCheck, Stethoscope } from 'lucide-react'
import { Marca } from '@/components/Marca'
import { supabaseServidor } from '@/lib/supabase/server'
import { entrarDemo } from '@/app/entrar/actions'
import { dataBR, horaBR } from '@/lib/formato'
import { aceitar } from './actions'
import s from './qr.module.css'

export const dynamic = 'force-dynamic'

// Página que o QR do paciente abre no celular do profissional.
export default async function ReceberQR({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ falhou?: string }> }) {
  const { token } = await params
  const { falhou } = await searchParams
  const valido = /^[a-f0-9]{16,64}$/.test(token)
  const sb = await supabaseServidor()
  const { data: { user } } = await sb.auth.getUser()
  const { data: prof } = user ? await sb.from('profissionais').select('nome,conselho,numero,uf').eq('user_id', user.id).maybeSingle() : { data: null }
  const { data: previa } = prof && valido ? await sb.rpc('previa_compartilhamento', { tok: token }) : { data: null }
  const p = previa as { primeiro_nome: string; fim: string } | null

  return (
    <main className={s.pagina}>
      <div className={s.cartao}>
        <Marca tamanho={36} />
        <span className={s.icone} aria-hidden="true"><QrCode size={28} /></span>
        <h1>Compartilhamento de dossiê</h1>

        {!user && (
          <>
            <p>Um paciente mostrou este QR para liberar o histórico de saúde dele. Para receber o acesso, entre com a sua conta de profissional.</p>
            <form action={entrarDemo}>
              <input type="hidden" name="conta" value="fernando" />
              <input type="hidden" name="volta" value={`/c/${token}`} />
              <button type="submit" className="btn btn-primario"><Stethoscope size={18} aria-hidden="true" />Entrar como Dr. Fernando (demonstração)</button>
            </form>
          </>
        )}

        {user && !prof && <p>Este QR é para profissionais de saúde. Peça ao médico que leia com a conta dele.</p>}

        {prof && !p && <p className={s.aviso}>{falhou === 'limite' ? 'Muitas tentativas seguidas. Espere alguns minutos.' : falhou ? 'Não deu para receber este acesso.' : 'Este QR venceu, já foi usado ou foi cancelado pelo paciente.'} Peça ao paciente um QR novo.</p>}

        {prof && p && (
          <>
            <div className={s.resumo}>
              <span><strong>Paciente:</strong> {p.primeiro_nome}</span>
              <span><Clock3 size={15} aria-hidden="true" />Acesso até {dataBR(p.fim)} às {horaBR(p.fim)}</span>
              <span><ShieldCheck size={15} aria-hidden="true" />Fica registrado em nome de {prof.nome}, {prof.conselho} {prof.numero}-{prof.uf}</span>
            </div>
            <form action={aceitar}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="btn btn-primario">Receber acesso e abrir o dossiê</button>
            </form>
            <p className={s.nota}>O paciente pode cancelar a qualquer momento e vê que você abriu o dossiê.</p>
          </>
        )}
        <Link href="/" className={s.voltar}>Voltar ao início</Link>
      </div>
    </main>
  )
}
