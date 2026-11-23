import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // fotos de documento tiradas no celular passam de 1 MB (o padrão das server actions)
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
}

export default nextConfig
