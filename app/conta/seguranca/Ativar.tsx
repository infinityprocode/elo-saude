'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { iniciarCadastro, confirmarCadastro, desativar } from './actions'
import s from '@/app/c/[token]/qr.module.css'

// Passo a passo da verificação em 2 etapas (app autenticador: Google Authenticator, Microsoft, 1Password...)
export function Ativar({ ativo }: { ativo: boolean }) {
  const router = useRouter()
  const [etapa, setEtapa] = useState<{ factorId: string; qr: string; segredo: string } | null>(null)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function comecar() {
    setOcupado(true); setErro('')
    const r = await iniciarCadastro()
    setOcupado(false)
    if (r.erro || !r.factorId) { setErro(r.erro ?? 'Não deu para começar.'); return }
    setEtapa({ factorId: r.factorId, qr: r.qr!, segredo: r.segredo! })
  }
  async function confirmar(e: React.FormEvent) {
    e.preventDefault(); setOcupado(true); setErro('')
    const r = await confirmarCadastro(etapa!.factorId, codigo)
    setOcupado(false)
    if (r.erro) { setErro(r.erro); return }
    setEtapa(null); setCodigo(''); router.refresh()
  }
  async function desligar() {
    if (!confirm('Desativar a verificação em 2 etapas? Sua conta fica protegida só pela senha.')) return
    setOcupado(true); setErro('')
    const r = await desativar()
    setOcupado(false)
    if (r.erro) { setErro(r.erro); return }
    router.refresh()
  }

  if (ativo) return (
    <>
      <p className={s.resumo}>Ativada. Ao entrar, o Elo pede a senha e o código do app autenticador. Sem o código, o banco não libera nenhum dossiê.</p>
      {erro && <p className={s.aviso} role="alert">{erro}</p>}
      <button type="button" className="btn btn-suave" onClick={desligar} disabled={ocupado}>Desativar</button>
    </>
  )
  if (!etapa) return (
    <>
      {erro && <p className={s.aviso} role="alert">{erro}</p>}
      <button type="button" className="btn btn-primario" onClick={comecar} disabled={ocupado}>{ocupado ? 'Preparando…' : 'Ativar com app autenticador'}</button>
    </>
  )
  return (
    <form onSubmit={confirmar} className={s.formulario}>
      <p>1. No app autenticador, leia o QR (ou digite a chave).</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={etapa.qr} alt="QR para o app autenticador" width={200} height={200} style={{ background: '#fff', borderRadius: 16, padding: 8, justifySelf: 'center' }} />
      <p className={s.nota}>Chave: <code style={{ wordBreak: 'break-all' }}>{etapa.segredo}</code></p>
      <label>2. Digite o código de 6 números<input value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} required /></label>
      {erro && <p className={s.aviso} role="alert">{erro}</p>}
      <button type="submit" className="btn btn-primario" disabled={ocupado}>{ocupado ? 'Conferindo…' : 'Confirmar e ativar'}</button>
    </form>
  )
}
