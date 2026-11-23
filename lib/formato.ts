const TZ = 'America/Sao_Paulo'

export function dataBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00-03:00') : new Date(iso)
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function horaBR(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

export function idade(nascimento: string, ref = new Date()): string {
  const n = new Date(nascimento + 'T12:00:00-03:00')
  let anos = ref.getFullYear() - n.getFullYear()
  const m = ref.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < n.getDate())) anos--
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

export const ORIGEM: Record<string, { rotulo: string; classe: string }> = {
  paciente_foto: { rotulo: 'Lido de foto do documento', classe: 'or-foto' },
  profissional: { rotulo: 'Registrado pelo profissional', classe: 'or-prof' },
  integracao_fhir: { rotulo: 'Recebido da unidade (FHIR)', classe: 'or-fhir' },
  paciente_manual: { rotulo: 'Anotado pelo paciente', classe: 'or-manual' },
}

export const TIPO_ATENDIMENTO: Record<string, string> = {
  consulta: 'Consulta', urgencia: 'Urgência', retorno: 'Retorno', teleconsulta: 'Teleconsulta', pre_natal: 'Pré-natal',
}

export const TIPO_ORG: Record<string, string> = {
  ubs: 'UBS', upa: 'UPA', clinica: 'Clínica', hospital: 'Hospital', laboratorio: 'Laboratório', consultorio: 'Consultório',
}
