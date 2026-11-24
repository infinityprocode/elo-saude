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
        <img src="/arte/3d/emergencia.webp" width={200} height={200} alt="" aria-hidden="true" decoding="async" style={{ width: 80, height: 80, flex: 'none', margin: '-4px 0 -4px -6px' }} />
        <h1>Cartão de emergência</h1>
        <p className={s.intro}>Mostra só o essencial para socorrer: alergias, remédios em uso e doenças crônicas.</p>
        <Formulario token={token} />
      </div>
    </main>
  )
}
