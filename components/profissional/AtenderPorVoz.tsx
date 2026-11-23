'use client'
import { useRef, useState } from 'react'
import { Keyboard, Loader2, Mic, Square, Sparkles, Stethoscope } from 'lucide-react'
import type { Estrutura } from '@/lib/ia'
import { registrarAtendimento } from '@/lib/acoes-profissional'
import s from './profissional.module.css'

const EXEMPLO = 'Paciente retorna com dor no joelho direito, melhorou um pouco com o anti-inflamatório. Hipótese: artrose do joelho direito. Como ele usa varfarina, vou suspender o diclofenaco e trocar por paracetamol 750 miligramas de 8 em 8 horas por 5 dias. Peço raio X do joelho direito e fisioterapia. Retorno em 30 dias.'

type Fase = 'inicio' | 'gravando' | 'processando' | 'revisar'

// Registro do atendimento: o médico fala (ou digita), a IA organiza, o médico revisa e assina.
export function AtenderPorVoz({ pacienteId, orgId, voltar, redePadrao = 'particular' }: { pacienteId: string; orgId?: string; voltar: string; redePadrao?: string }) {
  const [fase, setFase] = useState<Fase>('inicio')
  const [modoTexto, setModoTexto] = useState(false)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [ditado, setDitado] = useState('')
  const [e, setE] = useState<Estrutura | null>(null)
  const [seg, setSeg] = useState(0)
  const rec = useRef<MediaRecorder | null>(null)
  const partes = useRef<Blob[]>([])
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null)

  async function enviar(corpo: FormData | { texto: string }) {
    setFase('processando'); setErro('')
    const r = await fetch('/api/transcrever', corpo instanceof FormData ? { method: 'POST', body: corpo } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    const j = await r.json().catch(() => ({}))
    setDitado(j.ditado ?? '')
    if (!r.ok || !j.estrutura) { setErro(j.erro ?? 'Não deu para organizar. Preencha à mão.'); setE({ queixa: null, hipotese: null, cid10: null, conduta: j.ditado ?? null, medicamentos: [], exames: [], retorno_dias: null }) } else setE(j.estrutura)
    setFase('revisar')
  }

  async function gravar() {
    setErro('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream); partes.current = []
      mr.ondataavailable = (ev) => ev.data.size && partes.current.push(ev.data)
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); const fd = new FormData(); fd.append('audio', new Blob(partes.current, { type: mr.mimeType || 'audio/webm' }), 'ditado.webm'); enviar(fd) }
      mr.start(); rec.current = mr; setSeg(0); setFase('gravando')
      relogio.current = setInterval(() => setSeg((x) => x + 1), 1000)
    } catch { setErro('Não foi possível usar o microfone. Use a opção de digitar.'); setModoTexto(true) }
  }
  function parar() { if (relogio.current) clearInterval(relogio.current); rec.current?.stop() }

  return (
    <section className={`card ${s.caixa}`} id="atender" aria-labelledby="t-atender">
      <header className={s.topo}><h2 id="t-atender"><Stethoscope size={20} aria-hidden="true" />Registrar atendimento</h2><span className={s.ia}><Sparkles size={14} aria-hidden="true" />IA organiza, você assina</span></header>

      {fase === 'inicio' && (
        <div className={s.inicio}>
          {!modoTexto ? (
            <>
              <button type="button" className={s.mic} onClick={gravar}><Mic size={26} aria-hidden="true" /><span><strong>Falar o atendimento</strong><small>queixa, hipótese, conduta, receita e exames</small></span></button>
              <button type="button" className={s.alt} onClick={() => setModoTexto(true)}><Keyboard size={16} aria-hidden="true" />Prefiro digitar</button>
            </>
          ) : (
            <div className={s.digitar}>
              <label htmlFor="ditado">Ditado do atendimento</label>
              <textarea id="ditado" rows={5} value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Escreva como falaria: queixa, hipótese, conduta, remédios e exames." />
              <div className={s.linhaBtns}>
                <button type="button" className="btn btn-primario" disabled={texto.trim().length < 10} onClick={() => enviar({ texto })}><Sparkles size={16} aria-hidden="true" />Organizar com IA</button>
                <button type="button" className={s.alt} onClick={() => setTexto(EXEMPLO)}>Usar exemplo de ditado</button>
                <button type="button" className={s.alt} onClick={() => setModoTexto(false)}><Mic size={15} aria-hidden="true" />Voltar a falar</button>
              </div>
            </div>
          )}
          {erro && <p className={s.erro}>{erro}</p>}
        </div>
      )}

      {fase === 'gravando' && (
        <div className={s.gravando}>
          <span className={s.pulso} aria-hidden="true" /><strong className="num">{String(Math.floor(seg / 60)).padStart(2, '0')}:{String(seg % 60).padStart(2, '0')}</strong><span>Gravando. Fale o atendimento.</span>
          <button type="button" className="btn btn-primario" onClick={parar}><Square size={16} aria-hidden="true" />Parar e organizar</button>
        </div>
      )}

      {fase === 'processando' && <p className={s.proc}><Loader2 size={18} className={s.gira} aria-hidden="true" />Transcrevendo no servidor do Elo e organizando...</p>}

      {fase === 'revisar' && e && (
        <form action={registrarAtendimento} className={s.revisar}>
          <input type="hidden" name="paciente" value={pacienteId} /><input type="hidden" name="voltar" value={voltar} />
          {orgId && <input type="hidden" name="org" value={orgId} />}
          <input type="hidden" name="n_meds" value={e.medicamentos.length} />
          {erro && <p className={s.erro}>{erro}</p>}
          {ditado && <details className={s.ditado}><summary>Ver o que foi dito</summary><p>{ditado}</p></details>}
          <label>Queixa<textarea name="queixa" rows={2} defaultValue={e.queixa ?? ''} /></label>
          <div className={s.dois}><label>Hipótese<input name="hipotese" defaultValue={e.hipotese ?? ''} /></label><label>CID-10 (se houver)<input name="cid10" defaultValue={e.cid10 ?? ''} /></label></div>
          <label>Conduta<textarea name="conduta" rows={3} defaultValue={[e.conduta, e.retorno_dias ? `Retorno em ${e.retorno_dias} dias.` : ''].filter(Boolean).join(' ')} /></label>
          {e.medicamentos.length > 0 && <fieldset className={s.meds}><legend>Receita</legend>{e.medicamentos.map((m, i) => (
            <div key={i} className={s.med}>
              <label className={s.chk}><input type="checkbox" name={`med_${i}`} defaultChecked />Incluir</label>
              <input type="hidden" name={`med_${i}_pa`} value={m.principio_ativo} /><input type="hidden" name={`med_${i}_dias`} value={m.duracao_dias ?? 0} />
              <label>Remédio<input name={`med_${i}_nome`} defaultValue={m.nome} /></label>
              <div className={s.dois}><label>Dose<input name={`med_${i}_dose`} defaultValue={m.dose ?? ''} /></label><label>Como usar<input name={`med_${i}_pos`} defaultValue={[m.posologia, m.duracao_dias ? `por ${m.duracao_dias} dias` : ''].filter(Boolean).join(' ')} /></label></div>
            </div>))}</fieldset>}
          <label>Exames pedidos (um por linha)<textarea name="exames" rows={2} defaultValue={e.exames.map((x) => x.nome).join('\n')} /></label>
          <div className={s.dois}>
            <label>Rede<select name="rede" defaultValue={redePadrao}><option value="sus">SUS</option><option value="particular">Particular</option><option value="convenio">Convênio</option></select></label>
            <label>Convênio (se for o caso)<input name="operadora" /></label>
          </div>
          <p className={s.nota}>Ao assinar, o registro fica com seu nome e não pode ser alterado depois (correção por adendo). O paciente vê na auditoria.</p>
          <div className={s.linhaBtns}><button type="submit" className="btn btn-primario">Assinar e salvar no dossiê</button><button type="button" className={s.alt} onClick={() => { setFase('inicio'); setE(null) }}>Recomeçar</button></div>
        </form>
      )}
    </section>
  )
}
