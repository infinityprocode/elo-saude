import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServidor } from '@/lib/supabase/server'
import { idade } from '@/lib/formato'

export default async function AppInicio() {
  const sb = await supabaseServidor()
  const { data } = await sb.from('pacientes').select('id,nome,nascimento').order('nome')
  const lista = data ?? []
  if (lista.length === 1) redirect(`/app/p/${lista[0].id}`)
  return (
    <section style={{ paddingBlock: 24, display: 'grid', gap: 12 }}>
      <h1 style={{ fontSize: 24 }}>Dossiês que você gerencia</h1>
      {lista.length === 0 && <p>Nenhum dossiê por aqui ainda.</p>}
      {lista.map((p) => (
        <Link key={p.id} href={`/app/p/${p.id}`} className="card" style={{ padding: 16, color: 'inherit', textDecoration: 'none' }}>
          <strong>{p.nome}</strong> <span style={{ color: 'var(--muted)' }}>· {idade(p.nascimento)}</span>
        </Link>
      ))}
    </section>
  )
}
