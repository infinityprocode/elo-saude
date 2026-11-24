import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import localFont from 'next/font/local'
import './globals.css'

// Fontes servidas pelo próprio projeto (build não depende do Google). Manrope e JetBrains Mono, licença OFL.
const sans = localFont({ src: './fonts/manrope-latin.woff2', weight: '200 800', variable: '--font-sans', display: 'swap', adjustFontFallback: 'Arial' })
const mono = localFont({ src: './fonts/jetbrains-mono-latin.woff2', weight: '400 500', variable: '--font-mono', display: 'swap', preload: false })

export const metadata: Metadata = {
  title: 'Elo Saúde · seu histórico de saúde, completo, onde você for',
  description: 'Dossiê de saúde que se monta sozinho e chega completo ao próximo médico, com IA que avisa o que não combina. Projeto do Hack Brasil 2026.',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#eef3fa' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // CSP com nonce (middleware.ts): ler os cabeçalhos torna toda rota dinâmica, então todo script sai com o nonce desta resposta
  await headers()
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
