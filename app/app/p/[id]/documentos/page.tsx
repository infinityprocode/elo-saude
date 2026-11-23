import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Camera, CheckCircle2, Clock3, FileScan, LayoutGrid, QrCode, Sparkles } from 'lucide-react'
import { supabaseServidor } from '@/lib/supabase/server'
import { Moldura, Aba } from '@/components/shell/Moldura'
import { navPaciente } from '@/lib/navPaciente'
import { retrato, iniciais } from '@/lib/retratos'
import { dataBR } from '@/lib/formato'
import { Enviar } from './Enviar'
import s from './documentos.module.css'

export const dynamic = 'force-dynamic'

const ERROS: Record<string, string> = {
  arquivo: 'Escolha uma foto ou um PDF.', grande: 'Arquivo acima de 10 MB.', tipo: 'Use foto (JPG, PNG, WEBP) ou PDF.',
  envio: 'Não deu para guardar o arquivo. Tente de novo.', ia: 'A leitura automática falhou. Tente de novo em instantes.', salvar: 'Não deu para salvar. Tente de novo.',
}

export default async function Documentos({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; descartado?: string }> }) {
  const { id } = await params
  const { erro, descartado } = await searchParams
  const sb = await supabaseServidor()
  const { data: paciente } = await sb.from('pacientes').select('id,nome').eq('id', id).maybeSingle()
  if (!paciente) notFound()
  const { data: { user } } = await sb.auth.getUser()
  const { data: docs } = await sb.from('documentos').select('id,titulo,tipo,status,data_documento,criado_em').eq('paciente_id', id).neq('status', 'descartado').order('criado_em', { ascending: false })
  const pend = (docs ?? []).filter((d) => d.status === 'aguardando_confirmacao')
  const ehMae = user?.email?.startsWith('marina'); const quem = ehMae ? 'Marina Souza' : paciente.nome
  const primeiro = paciente.nome.split(' ')[0]
  const base = `/app/p/${id}`
  return (
    <Moldura nav={navPaciente(id, pend.length)} ativo="documentos" usuario={{ nome: quem, papel: '', iniciais: iniciais(quem), foto: retrato(quem) }}
      faixa={<div className={s.faixa}><span className={s.eyebrow}>{ehMae ? `Dossiê da ${primeiro} · você é a responsável` : 'Meu dossiê de saúde'}</span><h1>Papéis viram histórico</h1><p>Fotografe a receita, o pedido de exame ou o atestado. A IA lê, você confere e só então entra no dossiê.</p></div>}
      abas={<>
        <Aba on href={`${base}/documentos`} Icone={FileScan} titulo="Documentos" sub={pend.length ? `${pend.length} para conferir` : 'foto vira registro'} />
        <Aba href={base} Icone={LayoutGrid} titulo="Meu dossiê" sub="resumo e alertas" />
        <Aba href={`${base}/compartilhar`} Icone={QrCode} titulo="Compartilhar" sub="QR com prazo" />
      </>}>
      <div className={s.grade}>
        {erro && <p className={s.erro}>{ERROS[erro] ?? 'Algo deu errado. Tente de novo.'}</p>}
        {descartado && <p className={s.ok}>Leitura descartada. Nada foi salvo no dossiê.</p>}
        <section className={`card ${s.enviar}`} aria-labelledby="t-env">
          <header><h2 id="t-env"><Camera size={20} aria-hidden="true" />Adicionar documento</h2></header>
          <Enviar pacienteId={id} />
          <div className={s.exemplos}>
            <span className={s.exTit}><Sparkles size={15} aria-hidden="true" />Sem papel à mão? Teste com um documento fictício:</span>
            <div className={s.exLista}>
              {[['receita', 'Receita (letra de mão)', '/exemplos/receita.png'], ['pedido-exame', 'Pedido de exame', '/exemplos/pedido-exame.png'], ['atestado', 'Atestado', '/exemplos/atestado.png']].map(([k, rot, img]) => (
                <Enviar key={k} pacienteId={id} exemplo={k} rotulo={rot} miniatura={img} />
              ))}
            </div>
          </div>
        </section>
        <section className={`card ${s.lista}`} aria-labelledby="t-lista">
          <header><h2 id="t-lista"><FileScan size={20} aria-hidden="true" />Seus documentos</h2><span className="pill pill-info num">{(docs ?? []).length}</span></header>
          {(docs ?? []).length === 0 && <p className={s.sub}>Nenhum documento ainda.</p>}
          <ul>
            {(docs ?? []).map((d) => (
              <li key={d.id}>
                <span className={s.ico} aria-hidden="true"><FileScan size={18} /></span>
                <span className={s.txt}><strong>{d.titulo}</strong><small>{d.data_documento ? `Do dia ${dataBR(d.data_documento)}` : `Enviado em ${dataBR(d.criado_em)}`}</small></span>
                {d.status === 'aguardando_confirmacao'
                  ? <Link href={`${base}/documentos/${d.id}`} className={s.conferir}><Clock3 size={15} aria-hidden="true" />Conferir</Link>
                  : <span className="pill pill-ok"><CheckCircle2 size={13} aria-hidden="true" />no dossiê</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Moldura>
  )
}
