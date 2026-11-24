'use client'
import { useActionState } from 'react'
import { AlertTriangle, Droplet, Phone, Pill, ShieldAlert } from 'lucide-react'
import { abrirCartao, type Estado } from './actions'
import s from './emergencia.module.css'

export function Formulario({ token }: { token: string }) {
  const [estado, enviar, enviando] = useActionState<Estado, FormData>(abrirCartao, {})
  const c = estado.cartao
  if (c) {
    const anos = Math.floor((Date.now() - new Date(c.nascimento + 'T12:00:00-03:00').getTime()) / (365.25 * 864e5))
    return (
      <div className={s.cartao} aria-live="polite">
        <header><strong>{c.nome}</strong><span>{anos} anos{c.gestante ? ' · gestante' : ''}</span></header>
        {c.tipo_sanguineo && <p className={s.linha}><Droplet size={16} aria-hidden="true" />Tipo sanguíneo <b>{c.tipo_sanguineo}</b></p>}
        <section className={s.alergias}><h2><AlertTriangle size={18} aria-hidden="true" />Alergias</h2>{c.alergias.length ? <ul>{c.alergias.map((a, i) => <li key={i}><b>{a.substancia}</b>{a.gravidade ? ` (${a.gravidade})` : ''}{a.reacao ? `: ${a.reacao}` : ''}</li>)}</ul> : <p>Nenhuma registrada.</p>}</section>
        <section><h2><Pill size={18} aria-hidden="true" />Remédios em uso</h2>{c.remedios.length ? <ul>{c.remedios.map((r, i) => <li key={i}><b>{r.nome}</b>{r.posologia ? `, ${r.posologia}` : ''}</li>)}</ul> : <p>Nenhum.</p>}</section>
        <section><h2><ShieldAlert size={18} aria-hidden="true" />Doenças crônicas</h2>{c.cronicas.length ? <ul>{c.cronicas.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p>Nenhuma registrada.</p>}</section>
        {c.contato && <p className={s.linha}><Phone size={16} aria-hidden="true" />{c.contato}</p>}
        <p className={s.nota}>Este acesso foi registrado e o paciente ou responsável já vê o aviso no app do Elo.</p>
      </div>
    )
  }
  return (
    <form action={enviar} className={s.form}>
      <input type="hidden" name="token" value={token} />
      <label htmlFor="quem">Seu nome e função</label>
      <input id="quem" name="quem" placeholder="Ex.: Ana Lima, socorrista do SAMU" autoComplete="name" required />
      <label htmlFor="justificativa">Motivo do acesso</label>
      <textarea id="justificativa" name="justificativa" rows={3} placeholder="Ex.: paciente desacordada após queda, sem acompanhante" required />
      {estado.erro && <p className={s.erro}>{estado.erro}</p>}
      <button type="submit" className="btn btn-primario" disabled={enviando}>{enviando ? 'Abrindo...' : 'Abrir cartão de emergência'}</button>
      <p className={s.nota}>O acesso é registrado com seu nome e motivo, e o paciente ou responsável é avisado no app do Elo.</p>
    </form>
  )
}
