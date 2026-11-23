import QRCode from 'qrcode'

// QR em SVG, gerado no servidor (nada sai para serviço externo).
export async function qrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0d1b33', light: '#ffffff' } })
}

export const urlPublica = (caminho: string) => `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}${caminho}`
