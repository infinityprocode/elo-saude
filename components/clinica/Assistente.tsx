'use client'
import { useEffect, useRef, useState } from 'react'
import { FileText, History, Mic, Paperclip, Pill, Send, Sparkles } from 'lucide-react'
import type { ResumoPaciente } from '@/lib/resumo'
import s from './Assistente.module.css'

type Acao = 'resumo' | 'interacoes' | 'mudou'
type Msg = { de: 'elo' | 'eu'; texto?: string; linhas?: string[]; alertas?: ResumoPaciente['alertas']; hora: string }
const ACOES: { k: Acao; rotulo: string; pedido: (n: string) => string; Icone: typeof FileText }[] = [
  { k: 'resumo', rotulo: 'Resumo', pedido: (n) => `Resuma o histórico de ${n}.`, Icone: FileText },
  { k: 'interacoes', rotulo: 'Remédios e alertas', pedido: (n) => `Tem algo nos remédios de ${n} que eu deva ver?`, Icone: Pill },
  { k: 'mudou', rotulo: 'O que mudou', pedido: (n) => `O que mudou no histórico de ${n}?`, Icone: History },
]
const agora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

function rotear(t: string): Acao | null {
  const x = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/resum|historic|quem e/.test(x)) return 'resumo'
  if (/remedi|interac|alerg|alerta|medica/.test(x)) return 'interacoes'
  if (/mudou|novo|recente|ultim/.test(x)) return 'mudou'
  return null
}

// Assistente do painel em formato de conversa. Cada resposta sai do dossiê compartilhado com a clínica.
export function Assistente({ pacientes, saudacao }: { pacientes: ResumoPaciente[]; saudacao: string }) {
  const [pid, setPid] = useState(pacientes[0]?.id)
  const [msgs, setMsgs] = useState<Msg[]>([{ de: 'elo', texto: saudacao, hora: '' }])
  const [texto, setTexto] = useState('')
  const fim = useRef<HTMLDivElement>(null)
  const p = pacientes.find((x) => x.id === pid)
  useEffect(() => { fim.current?.scrollIntoView({ block: 'nearest' }) }, [msgs])

  function responder(a: Acao, pedido?: string) {
    if (!p) return
    const primeiro = p.nome.split(' ')[0]
    const h = agora()
    const resp: Msg = a === 'resumo' ? { de: 'elo', linhas: p.resumo, hora: h }
      : a === 'mudou' ? { de: 'elo', linhas: p.mudou, hora: h }
      : p.alertas.length ? { de: 'elo', alertas: p.alertas, hora: h } : { de: 'elo', texto: 'Nenhuma interação ou alerta nas regras conferidas.', hora: h }
    setMsgs((m) => [...m, { de: 'eu', texto: pedido ?? ACOES.find((x) => x.k === a)!.pedido(primeiro), hora: h }, resp])
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    const a = rotear(texto)
    const h = agora()
    if (a) responder(a, texto)
    else setMsgs((m) => [...m, { de: 'eu', texto, hora: h }, { de: 'elo', texto: 'Por enquanto respondo sobre o resumo, os remédios e alertas, e o que mudou no histórico.', hora: h }])
    setTexto('')
  }

  return (
    <section className={`card ${s.caixa}`} id="assistente" aria-label="Assistente do Elo">
      <header className={s.topo}>
        <div className={s.titulo}><Sparkles size={20} aria-hidden="true" /><h2>Assistente do Elo</h2></div>
        <p><span className={s.online} aria-hidden="true" />Online · lendo os dossiês compartilhados</p>
      </header>

      <div className={s.conversa} aria-live="polite">
        {msgs.map((m, i) => m.de === 'elo' ? (
          <div key={i} className={s.elo}>
            <span className={s.eloIco} aria-hidden="true"><Sparkles size={14} /></span>
            <div className={s.eloTxt}>
              {m.texto && <p>{m.texto}</p>}
              {m.linhas && <ul>{m.linhas.map((l, j) => <li key={j}>{l}</li>)}</ul>}
              {m.alertas && <ul className={s.alertas}>{m.alertas.map((al, j) => <li key={j} className={al.gravidade === 'alta' ? s.alta : s.media}><strong>{al.titulo}</strong><span>{al.detalhe}</span></li>)}</ul>}
              {(m.linhas || m.alertas) && <small>Apoio ao profissional, não diagnóstico.</small>}
            </div>
            {m.hora && <time className={s.hora}>{m.hora}</time>}
          </div>
        ) : (
          <div key={i} className={s.eu}><p>{m.texto}</p><time className={s.hora}>{m.hora}</time></div>
        ))}
        <div ref={fim} />
      </div>

      <div className={s.pacientes} role="radiogroup" aria-label="Sobre qual paciente">
        {pacientes.map((x) => (
          <button key={x.id} role="radio" aria-checked={x.id === pid} className={x.id === pid ? s.pOn : ''} onClick={() => setPid(x.id)}>
            {x.nome.split(' ')[0]}{x.alertas.length ? <em>{x.alertas.length}</em> : null}
          </button>
        ))}
      </div>
      <div className={s.chips}>
        {ACOES.map(({ k, rotulo, Icone }) => <button key={k} onClick={() => responder(k)}><Icone size={15} aria-hidden="true" />{rotulo}</button>)}
      </div>
      <form className={s.entrada} onSubmit={enviar}>
        <span className={s.mais} aria-hidden="true"><Paperclip size={17} /></span>
        <label className="sr" htmlFor="pergunta">Pergunte sobre o paciente</label>
        <input id="pergunta" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={`Pergunte sobre ${p?.nome.split(' ')[0] ?? 'o paciente'}...`} autoComplete="off" />
        <Mic size={17} className={s.mic} aria-hidden="true" />
        <button type="submit" aria-label="Enviar"><Send size={17} /></button>
      </form>
    </section>
  )
}
