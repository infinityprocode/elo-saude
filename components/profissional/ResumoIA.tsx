'use client'
import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import s from './profissional.module.css'

type Frase = { texto: string; fontes: { id: string; tipo: string }[] }

// Resumo de 30 segundos: só aparece frase que cita registros reais do dossiê (conferido no servidor).
export function ResumoIA({ pacienteId }: { pacienteId: string }) {
  const [frases, setFrases] = useState<Frase[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  async function gerar() {
    setCarregando(true); setErro('')
    const r = await fetch('/api/resumo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pacienteId }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setErro(j.erro ?? 'Não deu para resumir agora.'); else setFrases(j.frases)
    setCarregando(false)
  }
  const alvo = (id: string) => (id.startsWith('alerta-') ? '#alertas' : `#reg-${id}`)
  return (
    <section className={`card ${s.caixa} ${s.resumo}`} aria-labelledby="t-resumo">
      <header className={s.topo}><h2 id="t-resumo"><Sparkles size={20} aria-hidden="true" />Resumo em 30 segundos</h2>{frases && <button type="button" className={s.alt} onClick={gerar}>Gerar de novo</button>}</header>
      {!frases && !carregando && <button type="button" className="btn btn-primario" onClick={gerar}><Sparkles size={16} aria-hidden="true" />Resumir o histórico com IA</button>}
      {carregando && <p className={s.proc}><Loader2 size={18} className={s.gira} aria-hidden="true" />Lendo o dossiê...</p>}
      {erro && <p className={s.erro}>{erro}</p>}
      {frases && (
        <ol className={s.frases}>
          {frases.map((f, i) => (
            <li key={i}><span>{f.texto}</span><span className={s.fontes}>{f.fontes.map((x, j) => <a key={j} href={alvo(x.id)}>{x.tipo}</a>)}</span></li>
          ))}
        </ol>
      )}
      <p className={s.nota}>Cada frase mostra de onde veio. Apoio ao profissional, não diagnóstico.</p>
    </section>
  )
}
