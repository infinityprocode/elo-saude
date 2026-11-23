import Link from 'next/link'
import { Marca } from '@/components/Marca'
import s from './app.module.css'

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.casca}>
      <header className={s.barra}>
        <div className={`wrap ${s.barraIn}`}>
          <Link href="/app" aria-label="Início" style={{ color: 'inherit', textDecoration: 'none' }}><Marca tamanho={24} /></Link>
          <form action="/sair" method="post"><button className="btn btn-ghost" type="submit">Sair</button></form>
        </div>
      </header>
      <main className="wrap">{children}</main>
    </div>
  )
}
