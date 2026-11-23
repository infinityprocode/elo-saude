import { createServerClient, type CookieOptions } from '@supabase/ssr'

type Cookie = { name: string; value: string; options: CookieOptions }
import { cookies } from 'next/headers'

// Cliente com a sessão do usuário (respeita o RLS: cada um só vê o próprio dossiê).
export async function supabaseServidor() {
  const store = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista: Cookie[]) => {
        try { lista.forEach(({ name, value, options }) => store.set(name, value, options)) } catch { /* server component: só leitura */ }
      },
    },
  })
}
