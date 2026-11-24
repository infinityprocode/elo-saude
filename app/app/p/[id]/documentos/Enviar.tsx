'use client'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { enviarDocumento } from './actions'
import s from './documentos.module.css'

function Botao({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return <button type="submit" className={className} disabled={pending} aria-busy={pending}>{pending ? <><Loader2 size={17} className={s.gira} aria-hidden="true" />Lendo com IA...</> : children}</button>
}

// Formulário de envio: foto pela câmera (celular) ou arquivo; ou um exemplo fictício para testar.
export function Enviar({ pacienteId, exemplo, rotulo, miniatura }: { pacienteId: string; exemplo?: string; rotulo?: string; miniatura?: string }) {
  if (exemplo) return (
    <form action={enviarDocumento} className={s.exemplo}>
      <input type="hidden" name="paciente" value={pacienteId} /><input type="hidden" name="exemplo" value={exemplo} />
      {miniatura && <img src={miniatura} alt="" width={64} height={88} loading="lazy" />}
      <Botao className={s.exBtn}>{rotulo}</Botao>
    </form>
  )
  return (
    <form action={enviarDocumento} className={s.form}>
      <input type="hidden" name="paciente" value={pacienteId} />
      <label className={s.campo}>
        <img src="/arte/3d/documento.webp" width={200} height={200} alt="" aria-hidden="true" decoding="async" style={{ width: 64, height: 64, flex: 'none', margin: '-6px 0' }} />
        <span><strong>Tirar foto ou escolher arquivo</strong><small>JPG, PNG, WEBP ou PDF, até 10 MB</small></span>
        <input type="file" name="arquivo" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" required />
      </label>
      <Botao className="btn btn-primario">Enviar para leitura</Botao>
    </form>
  )
}
