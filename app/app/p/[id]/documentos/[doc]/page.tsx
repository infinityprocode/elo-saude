import { notFound, redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileScan, FlaskConical, Pill, Sparkles, Stethoscope } from 'lucide-react'
import { supabaseServidor } from '@/lib/supabase/server'
import { Moldura } from '@/components/shell/Moldura'
import { navPaciente } from '@/lib/navPaciente'
import { retrato, iniciais } from '@/lib/retratos'
import type { Leitura } from '@/lib/ia'
import { confirmarDocumento, descartarDocumento } from './actions'
import s from './conferir.module.css'

export const dynamic = 'force-dynamic'
const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export default async function Conferir({ params, searchParams }: { params: Promise<{ id: string; doc: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id, doc } = await params
  const { erro } = await searchParams
  const sb = await supabaseServidor()
  const { data: paciente } = await sb.from('pacientes').select('id,nome').eq('id', id).maybeSingle()
  if (!paciente) notFound()
  const { data: d } = await sb.from('documentos').select('id,titulo,status,arquivo_path,extraido').eq('id', doc).eq('paciente_id', id).maybeSingle()
  if (!d) notFound()
  if (d.status !== 'aguardando_confirmacao') redirect(`/app/p/${id}/documentos`)
  const L = d.extraido as Leitura
  const { data: assinado } = d.arquivo_path ? await sb.storage.from('documentos').createSignedUrl(d.arquivo_path, 120) : { data: null }
  const { data: { user } } = await sb.auth.getUser()
  const ehMae = user?.email?.startsWith('marina'); const quem = ehMae ? 'Marina Souza' : paciente.nome
  const nomeDiferente = L.paciente_nome && !sem(L.paciente_nome).includes(sem(paciente.nome).split(' ')[0])
  const ehPdf = d.arquivo_path?.endsWith('.pdf')
  const medico = L.profissional?.nome ?? ''
  const unidadeSUS = /\b(ubs|upa|usf|caps)\b/i.test(L.unidade ?? '')

  return (
    <Moldura nav={navPaciente(id, 1)} ativo="documentos" usuario={{ nome: quem, papel: '', iniciais: iniciais(quem), foto: retrato(quem) }}
      faixa={<div className={s.faixa}><span className={s.eyebrow}><Sparkles size={15} aria-hidden="true" />Leitura feita pela IA · confira antes de salvar</span><h1>{d.titulo}</h1><p>Nada entra no dossiê até você confirmar. Corrija o que precisar e desmarque o que não quiser salvar.</p></div>}>
      <form action={confirmarDocumento} className={s.grade}>
        <input type="hidden" name="paciente" value={id} /><input type="hidden" name="doc" value={doc} />
        <aside className={`card ${s.foto}`}>
          {assinado?.signedUrl && !ehPdf && <img src={assinado.signedUrl} alt="Foto do documento enviado" />}
          {assinado?.signedUrl && ehPdf && <a href={assinado.signedUrl} target="_blank" rel="noreferrer">Abrir o PDF enviado</a>}
          <small>Arquivo guardado de forma privada. Este link expira em 2 minutos.</small>
        </aside>

        <div className={s.campos}>
          {erro && <p className={s.erro}>Não deu para salvar. Tente de novo.</p>}
          {nomeDiferente && <p className={s.aviso}><AlertTriangle size={16} aria-hidden="true" />O documento está no nome de <b>{L.paciente_nome}</b>. Confira se é mesmo de {paciente.nome}.</p>}
          {!L.legivel && <p className={s.aviso}><AlertTriangle size={16} aria-hidden="true" />Parte do documento estava difícil de ler. Confira com atenção.</p>}
          {L.tipo === 'outro' && <p className={s.aviso}><AlertTriangle size={16} aria-hidden="true" />Isto não parece um documento de saúde.</p>}

          <section className={`card ${s.bloco}`}>
            <h2><Stethoscope size={18} aria-hidden="true" />Atendimento</h2>
            <div className={s.linha2}>
              <label>Data<input type="date" name="data" defaultValue={L.data_documento ?? ''} /></label>
              <label>Rede<select name="rede" defaultValue={unidadeSUS ? 'sus' : 'particular'}><option value="sus">SUS</option><option value="particular">Particular</option><option value="convenio">Convênio</option></select></label>
            </div>
            <label>Local<input name="local" defaultValue={L.unidade ?? ''} placeholder="UBS, clínica, consultório" /></label>
            <label>Profissional<input name="medico" defaultValue={medico} placeholder="Nome do profissional" /></label>
            <label>Convênio (se for o caso)<input name="operadora" placeholder="Nome do convênio" /></label>
            {L.diagnostico && <label className={s.check}><input type="checkbox" name="diag" defaultChecked /><span><b>Hipótese: {L.diagnostico.descricao}</b>{L.diagnostico.cid10 ? ` (CID ${L.diagnostico.cid10})` : ''}<small>“{L.diagnostico.trecho}”</small></span></label>}
            {L.orientacoes.length > 0 && <div className={s.orient}><small>Orientações lidas</small><ul>{L.orientacoes.map((o, i) => <li key={i}>{o}</li>)}</ul></div>}
          </section>

          {L.medicamentos.length > 0 && (
            <section className={`card ${s.bloco}`}>
              <h2><Pill size={18} aria-hidden="true" />Remédios ({L.medicamentos.length})</h2>
              {L.medicamentos.map((m, i) => (
                <div key={i} className={s.item}>
                  <label className={s.check}><input type="checkbox" name={`med_${i}`} defaultChecked={m.confianca !== 'baixa'} /><span><b>Incluir</b>{m.confianca !== 'alta' && <em className={m.confianca === 'baixa' ? s.baixa : s.media}>leitura {m.confianca}</em>}</span></label>
                  <label>Remédio<input name={`med_${i}_nome`} defaultValue={m.nome} /></label>
                  <div className={s.linha2}><label>Dose<input name={`med_${i}_dose`} defaultValue={m.dose ?? ''} /></label><label>Como usar<input name={`med_${i}_pos`} defaultValue={m.posologia ?? ''} /></label></div>
                  <small className={s.trecho}>No papel: “{m.trecho}”</small>
                </div>
              ))}
            </section>
          )}

          {L.exames.length > 0 && (
            <section className={`card ${s.bloco}`}>
              <h2><FlaskConical size={18} aria-hidden="true" />Exames pedidos ({L.exames.length})</h2>
              {L.exames.map((e, i) => <label key={i} className={s.check}><input type="checkbox" name={`ex_${i}`} defaultChecked /><span><b>{e.nome}</b><small>“{e.trecho}”</small></span></label>)}
            </section>
          )}
          {L.afastamento_dias ? <p className={s.info}><FileScan size={15} aria-hidden="true" />Afastamento de {L.afastamento_dias} dias registrado no documento.</p> : null}

          <div className={s.acoes}>
            <button type="submit" className="btn btn-primario"><CheckCircle2 size={18} aria-hidden="true" />Confirmar e salvar no dossiê</button>
            <button type="submit" formAction={descartarDocumento} className={s.descartar}>Descartar leitura</button>
          </div>
        </div>
      </form>
    </Moldura>
  )
}
