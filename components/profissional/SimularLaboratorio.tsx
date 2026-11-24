import { FlaskConical } from 'lucide-react'
import { simularLaboratorio } from '@/lib/acoes-integracao'
import s from '../DossieView.module.css'

const JOSE = '00000000-0000-4000-8000-0000000000c2'
const AVISO: Record<string, string> = {
  repetido: 'Essa mensagem do laboratório já tinha chegado: nada foi duplicado.',
  limite: 'Muitas simulações seguidas. Espere alguns minutos.',
  erro: 'A mensagem do laboratório não foi aceita.',
}

// Só aparece no José (fictício): simula o laboratório parceiro mandando resultados em FHIR R4.
export function SimularLaboratorio({ pacienteId, voltar, lab }: { pacienteId: string; voltar: string; lab?: string }) {
  if (pacienteId !== JOSE) return null
  const novos = lab?.startsWith('novos-') ? Number(lab.slice(6)) : 0
  return (
    <>
      <form action={simularLaboratorio}>
        <input type="hidden" name="paciente" value={pacienteId} />
        <input type="hidden" name="voltar" value={voltar} />
        <button type="submit" className={s.interopLink}><FlaskConical size={15} aria-hidden="true" />Simular resultado do laboratório (FHIR)</button>
      </form>
      {lab && <p role="status" className="pill pill-info">{novos ? `${novos} resultado(s) chegaram do Laboratório Vale Litoral por FHIR R4 e entraram no histórico.` : AVISO[lab] ?? ''}</p>}
    </>
  )
}
