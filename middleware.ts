import { createServerClient, type CookieOptions } from '@supabase/ssr'

type Cookie = { name: string; value: string; options: CookieOptions }
import { NextResponse, type NextRequest } from 'next/server'

// Renova a sessão e protege /app. Redireciona usando a URL pública (atrás do Caddy, nextUrl vira localhost).
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista: Cookie[]) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await sb.auth.getUser()
  if (!user && req.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/?entrar=1', process.env.NEXT_PUBLIC_APP_URL ?? req.url))
  }
  return res
}

export const config = { matcher: ['/app/:path*'] }
