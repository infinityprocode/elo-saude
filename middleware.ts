import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type Cookie = { name: string; value: string; options: CookieOptions }

// Rotas que exigem sessão (o banco ainda confere tudo por RLS; aqui é só o redirecionamento).
const PROTEGIDAS = ['/app', '/clinica', '/consultorio', '/conta', '/recepcao']
// Onde a sessão precisa ser lida/renovada (inclui a tela do QR, que mostra "entrar para aceitar").
const COM_SESSAO = [...PROTEGIDAS, '/c/']

// CSP com nonce por requisição (P-ELO-04): só roda script com o nonce desta resposta; nada de
// script inline solto, nada de iframe de terceiros, formulários só para o próprio site.
function politica(nonce: string) {
  const supa = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const ws = supa.replace(/^https:/, 'wss:')
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supa}`,
    "font-src 'self'",
    `connect-src 'self' ${supa} ${ws}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

function comCabecalhos(res: NextResponse, csp: string) {
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // câmera (foto de documento) e microfone (ditado) só no próprio site; resto desligado
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()')
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  return res
}

// Renova a sessão, protege as áreas logadas e aplica os cabeçalhos de segurança.
// Redireciona usando a URL pública (atrás do Caddy, nextUrl vira localhost).
export async function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = politica(nonce)
  // o Next lê o nonce do CSP da REQUISIÇÃO e o aplica nos scripts dele
  const cabecalhosReq = new Headers(req.headers)
  cabecalhosReq.set('x-nonce', nonce)
  cabecalhosReq.set('Content-Security-Policy', csp)

  let res = NextResponse.next({ request: { headers: cabecalhosReq } })
  const caminho = req.nextUrl.pathname
  if (!COM_SESSAO.some((r) => caminho.startsWith(r))) return comCabecalhos(res, csp)

  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista: Cookie[]) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: { headers: cabecalhosReq } })
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await sb.auth.getUser()
  if (!user && PROTEGIDAS.some((r) => caminho.startsWith(r))) {
    return comCabecalhos(NextResponse.redirect(new URL('/?entrar=1', process.env.NEXT_PUBLIC_APP_URL ?? req.url)), csp)
  }
  // 2 etapas (P-ELO-04): ativou e ainda não digitou o código nesta sessão → verificação.
  // O banco também barra (eu_profissional exige aal2), isto aqui só leva a pessoa para a tela certa.
  if (user && PROTEGIDAS.some((r) => caminho.startsWith(r))) {
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      return comCabecalhos(NextResponse.redirect(new URL('/verificar', process.env.NEXT_PUBLIC_APP_URL ?? req.url)), csp)
    }
  }
  return comCabecalhos(res, csp)
}

// tudo, menos arquivos estáticos (o Next serve esses sem passar por aqui)
export const config = {
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico|icon.svg|arte/|exemplos/|fonts/).*)' }],
}
