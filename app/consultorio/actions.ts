'use server'
import { redirect } from 'next/navigation'

// O profissional cola o link ou o código do QR (quando não dá para usar a câmera).
export async function irParaQR(form: FormData) {
  const bruto = String(form.get('codigo') ?? '').trim()
  const token = bruto.match(/[a-f0-9]{16,64}/)?.[0]
  redirect(token ? `/c/${token}` : '/consultorio?qr=invalido#receber')
}
