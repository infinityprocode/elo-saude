import { CalendarDays, FileText, LayoutGrid, Sparkles, Users } from 'lucide-react'
import type { ItemNav } from '@/components/shell/Moldura'

export function navClinica(alertas: number): ItemNav[] {
  return [
    { k: 'painel', href: '/clinica', rotulo: 'Visão geral', Icone: LayoutGrid },
    { k: 'pacientes', href: '/clinica#pacientes', rotulo: 'Pacientes', Icone: Users, badge: alertas },
    { k: 'agenda', href: '/clinica#agenda', rotulo: 'Agenda', Icone: CalendarDays },
    { k: 'assistente', href: '/clinica#assistente', rotulo: 'Assistente', Icone: Sparkles },
    { k: 'documentos', href: '/clinica#chegou', rotulo: 'Documentos', curto: 'Docs', Icone: FileText },
  ]
}
