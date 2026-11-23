import { Siren } from 'lucide-react'
import { Marca } from '@/components/Marca'
import { Formulario } from './Formulario'
import s from './emergencia.module.css'

export const dynamic = 'force-dynamic'

// Página aberta pelo QR de emergência. Não exige login: exige nome, motivo e fica auditada.
export default async function Emergencia({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return (
    <main className={s.pagina}>
      <div className={s.caixa}>
        <Marca tamanho={34} />
        <span className={s.icone} aria-hidden="true"><Siren size={26} /></span>
        <h1>Cartão de emergência</h1>
        <p className={s.intro}>Mostra só o essencial para socorrer: alergias, remédios em uso e doenças crônicas.</p>
        <Formulario token={token} />
      </div>
    </main>
  )
}
